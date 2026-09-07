import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AdminGateway } from '../admin/admin.gateway';
import { RefundStatus } from '@prisma/client';

export class CreateRefundDto {
  applicationId: string;
  userId?: string;
  reason: string;
  details?: string;
  proofUrl?: string;
}

@Injectable()
export class RefundsService {
  private readonly logger = new Logger('RefundsService');

  constructor(private readonly prisma: PrismaService) {}

  private generateRefNumber(): string {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `REF-2026${randomNum}`;
  }

  async createRefundRequest(dto: CreateRefundDto) {
    const isMongoId = (id?: string) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

    // 1. Locate application
    const application = await this.prisma.application.findFirst({
      where: isMongoId(dto.applicationId)
        ? { OR: [{ id: dto.applicationId }, { refNumber: dto.applicationId }] }
        : { refNumber: dto.applicationId },
      include: { user: { include: { profile: true } } },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // 2. Check if a pending refund already exists
    const existingPending = await this.prisma.refundRequest.findFirst({
      where: {
        applicationId: application.id,
        status: RefundStatus.PENDING,
      },
      include: {
        user: { include: { profile: true } },
        application: true,
      },
    });

    if (existingPending) {
      this.logger.log(
        `[Refunds] Refund already pending for application #${application.refNumber} (${existingPending.refNumber}). Returning existing claim idempotently.`,
      );
      return {
        success: true,
        id: existingPending.id,
        refNumber: existingPending.refNumber,
        amount: existingPending.amount,
        status: existingPending.status,
        message: 'A refund request is already pending review for this application.',
        refund: existingPending,
        alreadyPending: true,
      };
    }

    // 3. Resolve user
    const resolvedUserId: string = String(application.userId || dto.userId || 'system');
    const refundRefNumber = this.generateRefNumber();
    const refundAmount = Number(application.feePaid) || 50.0;

    // 4. Create RefundRequest
    const refund = await this.prisma.refundRequest.create({
      data: {
        refNumber: refundRefNumber,
        applicationId: application.id,
        userId: resolvedUserId,
        serviceTitle: application.serviceTitle,
        amount: refundAmount,
        reason: dto.reason || 'Citizen requested fee refund',
        details: dto.details,
        proofUrl: dto.proofUrl,
        status: RefundStatus.PENDING,
      },
      include: {
        user: { include: { profile: true } },
        application: true,
      },
    });

    // 5. Update application refund status
    await this.prisma.application.update({
      where: { id: application.id },
      data: { refundStatus: 'PENDING' },
    });

    // 6. Broadcast real-time events to Admin Web Panel & Mobile
    try {
      AdminGateway.broadcast('new_refund_requested', refund);
      AdminGateway.broadcast('refunds_updated', refund);
      AdminGateway.broadcast('application_status_changed', {
        id: application.id,
        refNumber: application.refNumber,
        userId: application.userId,
        status: application.status,
        refundStatus: 'PENDING',
        serviceTitle: application.serviceTitle,
      });

      await AdminGateway.logActivity(this.prisma, {
        userId: resolvedUserId,
        action: 'REFUND_REQUESTED',
        details: `Citizen submitted refund request #${refundRefNumber} of ₹${refundAmount} for application #${application.refNumber} (${application.serviceTitle})`,
      });
    } catch (wsErr: any) {
      this.logger.warn(`WS broadcast warning: ${wsErr?.message}`);
    }

    return {
      success: true,
      id: refund.id,
      refNumber: refund.refNumber,
      amount: refund.amount,
      status: refund.status,
      message: 'Refund request submitted successfully.',
      refund,
      alreadyPending: false,
    };
  }

  async getAllRefunds(query?: { userId?: string; status?: string; applicationId?: string }) {
    const isMongoId = (id?: string) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
    const where: any = {};

    if (query?.userId && query.userId !== 'all') {
      if (isMongoId(query.userId)) {
        where.userId = query.userId;
      }
    }

    if (query?.applicationId) {
      if (isMongoId(query.applicationId)) {
        where.applicationId = query.applicationId;
      }
    }

    if (query?.status && query.status !== 'ALL') {
      const upper = query.status.toUpperCase();
      if (Object.values(RefundStatus).includes(upper as RefundStatus)) {
        where.status = upper as RefundStatus;
      }
    }

    return this.prisma.refundRequest.findMany({
      where,
      include: {
        user: { include: { profile: true } },
        application: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRefundById(id: string) {
    const isMongoId = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
    const refund = await this.prisma.refundRequest.findFirst({
      where: isMongoId(id) ? { OR: [{ id }, { refNumber: id }] } : { refNumber: id },
      include: {
        user: { include: { profile: true } },
        application: true,
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }
    return refund;
  }

  async approveRefund(id: string, adminName: string = 'Admin Authority') {
    const isMongoId = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
    const refund = await this.prisma.refundRequest.findFirst({
      where: isMongoId(id) ? { OR: [{ id }, { refNumber: id }] } : { refNumber: id },
      include: {
        user: { include: { profile: true } },
        application: true,
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    if (refund.status === RefundStatus.APPROVED) {
      throw new BadRequestException('This refund request has already been approved and credited.');
    }

    const refundAmount = Number(refund.amount) || 50.0;
    const now = new Date();

    // 1. Update refund record
    const updatedRefund = await this.prisma.refundRequest.update({
      where: { id: refund.id },
      data: {
        status: RefundStatus.APPROVED,
        processedBy: adminName,
        processedAt: now,
      },
      include: {
        user: { include: { profile: true } },
        application: true,
      },
    });

    // 2. Update application status
    await this.prisma.application.update({
      where: { id: refund.applicationId },
      data: {
        refundStatus: 'APPROVED',
        paymentStatus: 'Refunded',
      },
    });

    // 3. CREDIT WALLET FOR CITIZEN
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId: refund.userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId: refund.userId,
          balance: 0.0,
        },
      });
    }

    const newBalance = Number((wallet.balance + refundAmount).toFixed(2));

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });

    // 4. Create WalletTransaction
    const txn = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: refund.userId,
        type: 'CREDIT',
        title: `Refund: ${refund.serviceTitle}`,
        subtitle: `Application #${refund.application.refNumber}`,
        amount: refundAmount,
        refId: refund.refNumber,
        status: 'SUCCESS',
      },
    });

    // 5. Create Notification Record for Citizen
    const notifTitle = 'Refund Credited to Wallet';
    const notifBody = `₹${refundAmount.toFixed(2)} for application #${refund.application.refNumber} (${refund.serviceTitle}) has been refunded directly to your CyberSave wallet.`;

    const notification = await this.prisma.notification.create({
      data: {
        userId: refund.userId,
        title: notifTitle,
        body: notifBody,
        type: 'PAYMENT',
        status: 'SENT',
        sentAt: now,
      },
    });

    // 6. Broadcast Real-time Events
    try {
      AdminGateway.emitToUser(refund.userId, 'wallet_updated', {
        balance: newBalance,
        transaction: txn,
      });

      AdminGateway.emitToUser(refund.userId, 'refund_approved', {
        refund: updatedRefund,
        amount: refundAmount,
        newBalance,
        notification,
      });

      AdminGateway.emitToUser(refund.userId, 'notification_received', notification);

      AdminGateway.broadcast('refunds_updated', updatedRefund);
      AdminGateway.broadcast('applications_updated');
      AdminGateway.broadcast('wallet_transactions_updated');

      await AdminGateway.logActivity(this.prisma, {
        userId: refund.userId,
        action: 'REFUND_APPROVED',
        details: `Admin "${adminName}" approved refund #${refund.refNumber} of ₹${refundAmount} for application #${refund.application.refNumber}. Wallet credited to ₹${newBalance}.`,
      });
    } catch (wsErr: any) {
      this.logger.warn(`WS broadcast warning on approve: ${wsErr?.message}`);
    }

    return {
      success: true,
      refund: updatedRefund,
      newBalance,
      transaction: txn,
      notification,
    };
  }

  async rejectRefund(id: string, rejectionReason?: string, adminName: string = 'Admin Authority') {
    const isMongoId = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
    const refund = await this.prisma.refundRequest.findFirst({
      where: isMongoId(id) ? { OR: [{ id }, { refNumber: id }] } : { refNumber: id },
      include: {
        user: { include: { profile: true } },
        application: true,
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    const updatedRefund = await this.prisma.refundRequest.update({
      where: { id: refund.id },
      data: {
        status: RefundStatus.REJECTED,
        adminNotes: rejectionReason || 'Refund request declined by administration.',
        processedBy: adminName,
        processedAt: new Date(),
      },
      include: {
        user: { include: { profile: true } },
        application: true,
      },
    });

    await this.prisma.application.update({
      where: { id: refund.applicationId },
      data: { refundStatus: 'REJECTED' },
    });

    // Create Notification
    const notif = await this.prisma.notification.create({
      data: {
        userId: refund.userId,
        title: 'Refund Request Declined',
        body: `Refund for application #${refund.application.refNumber} was not approved: ${rejectionReason || 'Policy criteria not met.'}`,
        type: 'APPLICATION_UPDATE',
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    try {
      AdminGateway.emitToUser(refund.userId, 'refund_rejected', {
        refund: updatedRefund,
        notification: notif,
      });
      AdminGateway.emitToUser(refund.userId, 'notification_received', notif);
      AdminGateway.broadcast('refunds_updated', updatedRefund);
      AdminGateway.broadcast('applications_updated');

      await AdminGateway.logActivity(this.prisma, {
        userId: refund.userId,
        action: 'REFUND_REJECTED',
        details: `Admin "${adminName}" declined refund #${refund.refNumber} for application #${refund.application.refNumber}. Reason: ${rejectionReason}`,
      });
    } catch (wsErr: any) {
      this.logger.warn(`WS broadcast warning: ${wsErr?.message}`);
    }

    return {
      success: true,
      refund: updatedRefund,
      notification: notif,
    };
  }
}
