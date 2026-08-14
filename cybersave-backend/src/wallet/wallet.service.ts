import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class WalletService {
  private readonly logger = new Logger('WalletService');

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: 0.0,
        },
        include: { transactions: true },
      });
    }

    return wallet;
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
