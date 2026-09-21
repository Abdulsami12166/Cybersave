import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class WalletService {
  private readonly logger = new Logger('WalletService');

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateWallet(userId: string) {
    const isMongoId = (id?: string) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

    let realUserId = userId;
    let userRecord: any = null;
    if (isMongoId(userId)) {
      userRecord = await this.prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
    } else {
      userRecord = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: userId }, { phone: userId }, { keycloakId: userId }],
        },
      }).catch(() => null);
    }

    if (userRecord) {
      realUserId = userRecord.id;
    }

    let wallet = await this.prisma.wallet.findUnique({
      where: { userId: realUserId },
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId: realUserId,
          balance: 0.0,
        },
        include: { transactions: true },
      });
    }

    // Aggregate user service applications (debits/payments) & refund requests
    const [applications, refundRequests] = await Promise.all([
      this.prisma.application.findMany({
        where: { userId: realUserId },
        orderBy: { submittedAt: 'desc' },
      }).catch(() => []),
      this.prisma.refundRequest.findMany({
        where: { userId: realUserId },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
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
          createdAt: app.submittedAt || (app as any).createdAt || new Date(),
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

    const allTransactions = [...(wallet.transactions || []), ...extraTxns].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return {
      ...wallet,
      transactions: allTransactions,
    };
  }

  async addMoney(userId: string, amount: number, paymentMethod = 'UPI') {
    const wallet = await this.getOrCreateWallet(userId);

    const updatedWallet = await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: amount },
      },
    });

    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type: TransactionType.CREDIT,
        title: `Wallet Added via ${paymentMethod}`,
        subtitle: `${new Date().toLocaleDateString('en-IN')}`,
        amount,
        status: 'SUCCESS',
      },
    });

    return updatedWallet;
  }
}
