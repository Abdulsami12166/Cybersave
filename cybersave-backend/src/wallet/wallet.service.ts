import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TransactionType } from '@prisma/client';

/** Maximum wallet transactions returned to any client (list view). */
const MAX_TRANSACTIONS = 50;
/** Maximum synthetic payment/refund entries derived from other collections. */
const MAX_SYNTHETIC_TXNS = 50;

@Injectable()
export class WalletService {
  private readonly logger = new Logger('WalletService');

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateWallet(userId: string) {
    const isMongoId = (id?: string) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

    let realUserId = userId;
    if (!isMongoId(userId)) {
      const userRecord = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: userId }, { phone: userId }, { keycloakId: userId }],
        },
        select: { id: true },
      }).catch(() => null);
      realUserId = userRecord?.id || 'default-user-id';
    }

    // PERF: previously this method loaded EVERY wallet transaction, EVERY
    // application (with all formData blobs) and EVERY refund request for the
    // user on each GET /wallet, then merged and sorted them in memory.
    // It now: (1) selects only the fields the mobile wallet screen renders,
    // (2) bounds every query, and (3) skips the synthetic transaction rebuild
    // entirely once the user has any persisted wallet transactions, since
    // application fees and refunds are already written there as real rows.
    const existingTxnCount = await this.prisma.walletTransaction.count({
      where: { wallet: { userId: realUserId } },
    });

    const wallet = await this.prisma.wallet.upsert({
      where: { userId: realUserId },
      create: { userId: realUserId, balance: 0.0 },
      update: {},
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: MAX_TRANSACTIONS,
        },
      },
    });

    if (existingTxnCount > 0) {
      return wallet;
    }

    // Fresh wallet with no persisted transactions yet: derive the recent
    // service-payment history from applications/refunds (bounded, lean) so the
    // wallet screen is not empty for existing citizens.
    const [applications, refundRequests] = await Promise.all([
      this.prisma.application.findMany({
        where: { userId: realUserId, feePaid: { gt: 0 } },
        orderBy: { submittedAt: 'desc' },
        take: MAX_SYNTHETIC_TXNS,
        select: {
          id: true,
          refNumber: true,
          serviceTitle: true,
          feePaid: true,
          paymentStatus: true,
          submittedAt: true,
        },
      }).catch(() => [] as any[]),
      this.prisma.refundRequest.findMany({
        where: { userId: realUserId },
        orderBy: { createdAt: 'desc' },
        take: MAX_SYNTHETIC_TXNS,
        select: {
          id: true,
          refNumber: true,
          serviceTitle: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      }).catch(() => [] as any[]),
    ]);

    const existingRefIds = new Set(
      (wallet.transactions || []).map((t: any) => t.refId).filter(Boolean),
    );

    const extraTxns: any[] = [];

    // 1. Service application fee payments (DEBIT)
    for (const app of applications) {
      if (app.feePaid && app.feePaid > 0 && !existingRefIds.has(app.refNumber)) {
        extraTxns.push({
          id: `app_tx_${app.id}`,
          walletId: wallet.id,
          userId: realUserId,
          type: 'DEBIT',
          title: `Payment: ${app.serviceTitle}`,
          subtitle: `App #${app.refNumber}`,
          amount: Number(app.feePaid),
          refId: app.refNumber,
          status: app.paymentStatus === 'Refunded' ? 'REFUNDED' : 'SUCCESS',
          createdAt: app.submittedAt || new Date(),
        });
      }
    }

    // 2. Refund requests (REFUND / CREDIT)
    for (const ref of refundRequests) {
      if (!existingRefIds.has(ref.refNumber)) {
        const isApproved = ref.status === 'APPROVED';
        extraTxns.push({
          id: `ref_tx_${ref.id}`,
          walletId: wallet.id,
          userId: realUserId,
          type: isApproved ? 'CREDIT' : 'REFUND',
          title: isApproved ? `Refund: ${ref.serviceTitle}` : `Refund Claim: ${ref.serviceTitle}`,
          subtitle: `Ref: ${ref.refNumber} • ${ref.status}`,
          amount: Number(ref.amount),
          refId: ref.refNumber,
          status: isApproved ? 'SUCCESS' : ref.status,
          createdAt: ref.createdAt || new Date(),
        });
      }
    }

    const allTransactions = [...(wallet.transactions || []), ...extraTxns]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, MAX_TRANSACTIONS);

    return {
      ...wallet,
      transactions: allTransactions,
    };
  }

  async addMoney(userId: string, amount: number, paymentMethod = 'UPI') {
    const wallet = await this.getOrCreateWallet(userId);

    const [updatedWallet] = await Promise.all([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: TransactionType.CREDIT,
          title: `Wallet Added via ${paymentMethod}`,
          subtitle: `${new Date().toLocaleDateString('en-IN')}`,
          amount,
          status: 'SUCCESS',
        },
      }),
    ]);

    return updatedWallet;
  }
}
