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
    const citizenName =
      application.user?.profile?.fullName ||
      (application.user?.email ? application.user.email.split('@')[0] : 'Citizen Applicant');

    // 4. Create RefundRequest in Database
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

    // 6. Create or Link Support Ticket with Category 'Refund Request'
    const nowTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const nowIso = new Date().toISOString();
    const ticket = await this.prisma.supportTicket.create({
      data: {
        refNumber: refundRefNumber,
        userId: resolvedUserId,
        title: `Refund Claim: ₹${refundAmount.toFixed(2)} - ${application.serviceTitle}`,
        description: `Citizen requested fee refund for Application #${application.refNumber}.\nReason: ${dto.reason || 'Citizen requested fee refund'}${dto.details ? '\nDetails: ' + dto.details : ''}`,
        category: 'Refund Request',
        priority: 'High',
        status: 'OPEN',
        attachmentUrl: dto.proofUrl || null,
        messages: [
          {
            id: `msg-refund-${refund.id}`,
            senderId: resolvedUserId,
            senderName: citizenName,
            role: 'CITIZEN',
            text: `Refund Request of ₹${refundAmount.toFixed(2)} submitted for Application #${application.refNumber}.\n\nReason: ${dto.reason || 'Fee Refund'}${dto.details ? '\n\nDetails: ' + dto.details : ''}`,
            attachmentUrl: dto.proofUrl || null,
            time: nowTimeStr,
            timestamp: nowIso,
          },
        ] as any,
      },
      include: { user: { include: { profile: true } } },
    });

    // 7. Broadcast real-time events to Admin Web Panel & Mobile
    try {
      AdminGateway.broadcast('new_refund_requested', refund);
      AdminGateway.broadcast('refunds_updated', refund);
      AdminGateway.broadcast('new_support_ticket', {
        id: ticket.refNumber,
        rawId: ticket.id,
        refNumber: ticket.refNumber,
        title: ticket.title,
        description: ticket.description,
        category: 'Refund Request',
        priority: 'High',
        status: 'OPEN',
        refundAmount,
        refundStatus: 'PENDING',
        refundId: refund.id,
        applicationId: application.id,
        applicationRef: application.refNumber,
        serviceTitle: application.serviceTitle,
        attachmentUrl: dto.proofUrl || null,
        createdOn: 'Today',
        lastUpdated: 'Today',
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        reporter: {
          id: resolvedUserId,
          name: citizenName,
          email: application.user?.email || '',
          phone: application.user?.phone || '',
        },
        messages: ticket.messages,
      });
      AdminGateway.broadcast('support_tickets_updated');
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
      message: 'Refund request submitted and logged in Support Tickets.',
      refund,
      ticket,
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

  async approveRefund(id: string, adminName: string = 'Principal Verification Officer (SDM)') {
    const isMongoId = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
    const cleanId = String(id || '').trim();
    const strippedId = cleanId.replace(/^(REF-|TKT-)/i, '').trim();

    const refund = await this.prisma.refundRequest.findFirst({
      where: {
        OR: [
          ...(isMongoId(cleanId) ? [{ id: cleanId }] : []),
          { refNumber: cleanId },
          { refNumber: `REF-${strippedId}` },
          { refNumber: { contains: strippedId, mode: 'insensitive' } },
          { applicationId: cleanId },
        ],
      },
      include: {
        user: { include: { profile: true } },
        application: true,
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    // IDEMPOTENCY GUARD: Do not credit wallet twice if already approved
    if (refund.status === RefundStatus.APPROVED) {
      this.logger.warn(`Refund #${refund.refNumber} already approved. Returning state idempotently without re-crediting.`);
      const existingWallet = await this.prisma.wallet.findUnique({
        where: { userId: refund.userId },
      });
      return {
        success: true,
        refund,
        alreadyProcessed: true,
        newBalance: existingWallet?.balance || 0,
        message: 'Refund has already been approved and credited to wallet.',
      };
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
        journey: [
          { title: 'Refund Initiated', desc: 'Citizen requested fee refund', time: refund.createdAt ? new Date(refund.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Initiated', state: 'done' },
          { title: 'Processing by Authority', desc: `Verified and authorized by ${adminName}`, time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), state: 'done' },
          { title: 'Credited to Wallet', desc: `₹${refundAmount.toFixed(2)} credited directly into citizen wallet`, time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), state: 'done' },
        ] as any,
      },
      include: {
        user: { include: { profile: true } },
        application: true,
      },
    });

    // 2. Update application status
    if (refund.applicationId) {
      await this.prisma.application.update({
        where: { id: refund.applicationId },
        data: {
          refundStatus: 'APPROVED',
          paymentStatus: 'Refunded',
        },
      }).catch(() => null);
    }

    // 3. CREDIT WALLET FOR CITIZEN (AUTHORITATIVE EXACT USER)
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

    // 4. Create WalletTransaction ledger entry
    const txn = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: refund.userId,
        type: 'CREDIT',
        title: `Refund: ${refund.serviceTitle || refund.application?.serviceTitle || 'Government Service Fee'}`,
        subtitle: `Application #${refund.application?.refNumber || 'N/A'}`,
        amount: refundAmount,
        refId: refund.refNumber,
        status: 'SUCCESS',
      },
    });

    // 5. Update corresponding SupportTicket to RESOLVED
    const ticketMatch = await this.prisma.supportTicket.findFirst({
      where: {
        OR: [
          { refNumber: refund.refNumber },
          { refNumber: `TKT-${refund.refNumber}` },
          { refNumber: cleanId },
          { description: { contains: refund.refNumber } },
        ],
      },
    });

    if (ticketMatch) {
      const existingMsgs = Array.isArray(ticketMatch.messages) ? (ticketMatch.messages as any[]) : [];
      const resolutionMsg = {
        id: `msg-refund-appr-${Date.now()}`,
        senderId: 'admin-desk',
        senderName: `${adminName} (Official Resolution)`,
        role: 'AGENT',
        text: `✅ Refund Claim Approved! ₹${refundAmount.toFixed(2)} has been credited directly to your CyberSave mobile wallet balance. Application #${refund.application?.refNumber || 'N/A'} is marked as Refunded.`,
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: now.toISOString(),
        isResolution: true,
      };
      await this.prisma.supportTicket.update({
        where: { id: ticketMatch.id },
        data: {
          status: 'RESOLVED',
          messages: [...existingMsgs, resolutionMsg] as any,
          updatedAt: now,
        },
      }).catch(() => null);
    }

    // 6. Create Notification Record for Citizen
    const notifTitle = 'Refund Credited to Wallet';
    const notifBody = `Your refund of ₹${refundAmount.toFixed(2)} for application #${refund.application?.refNumber || 'N/A'} (${refund.serviceTitle || 'Government Service'}) has been credited to your CyberSave wallet.`;

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

    // 7. Broadcast Real-time Events
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

      AdminGateway.broadcast('refund_approved', updatedRefund);
      AdminGateway.broadcast('refunds_updated', updatedRefund);
      AdminGateway.broadcast('support_tickets_updated');
      AdminGateway.broadcast('applications_updated');
      AdminGateway.broadcast('wallet_transactions_updated');
      AdminGateway.broadcast('transactions_updated');
      AdminGateway.broadcast('dashboard_updated');
      AdminGateway.broadcast('analytics_updated');

      await AdminGateway.logActivity(this.prisma, {
        userId: refund.userId,
        action: 'REFUND_APPROVED',
        details: `Admin "${adminName}" approved refund #${refund.refNumber} of ₹${refundAmount} for application #${refund.application?.refNumber || 'N/A'}. Wallet credited to ₹${newBalance}.`,
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

  async rejectRefund(id: string, rejectionReason?: string, adminName: string = 'Principal Verification Officer (SDM)') {
    const isMongoId = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
    const cleanId = String(id || '').trim();
    const strippedId = cleanId.replace(/^(REF-|TKT-)/i, '').trim();

    const refund = await this.prisma.refundRequest.findFirst({
      where: {
        OR: [
          ...(isMongoId(cleanId) ? [{ id: cleanId }] : []),
          { refNumber: cleanId },
          { refNumber: `REF-${strippedId}` },
          { refNumber: { contains: strippedId, mode: 'insensitive' } },
        ],
      },
      include: {
        user: { include: { profile: true } },
        application: true,
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    const now = new Date();
    const updatedRefund = await this.prisma.refundRequest.update({
      where: { id: refund.id },
      data: {
        status: RefundStatus.REJECTED,
        adminNotes: rejectionReason || 'Refund request declined by administration.',
        processedBy: adminName,
        processedAt: now,
      },
      include: {
        user: { include: { profile: true } },
        application: true,
      },
    });

    if (refund.applicationId) {
      await this.prisma.application.update({
        where: { id: refund.applicationId },
        data: { refundStatus: 'REJECTED' },
      }).catch(() => null);
    }

    // Update corresponding support ticket
    const ticketMatch = await this.prisma.supportTicket.findFirst({
      where: {
        OR: [
          { refNumber: refund.refNumber },
          { refNumber: `TKT-${refund.refNumber}` },
          { refNumber: cleanId },
        ],
      },
    });

    if (ticketMatch) {
      const existingMsgs = Array.isArray(ticketMatch.messages) ? (ticketMatch.messages as any[]) : [];
      const resolutionMsg = {
        id: `msg-refund-rej-${Date.now()}`,
        senderId: 'admin-desk',
        senderName: `${adminName} (Official Resolution)`,
        role: 'AGENT',
        text: `✕ Refund Request Declined: ${rejectionReason || 'Policy criteria not met.'}`,
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: now.toISOString(),
        isResolution: true,
      };
      await this.prisma.supportTicket.update({
        where: { id: ticketMatch.id },
        data: {
          status: 'RESOLVED',
          messages: [...existingMsgs, resolutionMsg] as any,
          updatedAt: now,
        },
      }).catch(() => null);
    }

    // Create Notification
    const notif = await this.prisma.notification.create({
      data: {
        userId: refund.userId,
        title: 'Refund Request Declined',
        body: `Refund for application #${refund.application?.refNumber || 'N/A'} was not approved: ${rejectionReason || 'Policy criteria not met.'}`,
        type: 'APPLICATION_UPDATE',
        status: 'SENT',
        sentAt: now,
      },
    });

    try {
      AdminGateway.emitToUser(refund.userId, 'refund_rejected', {
        refund: updatedRefund,
        notification: notif,
      });
      AdminGateway.emitToUser(refund.userId, 'notification_received', notif);
      AdminGateway.broadcast('refunds_updated', updatedRefund);
      AdminGateway.broadcast('support_tickets_updated');
      AdminGateway.broadcast('applications_updated');

      await AdminGateway.logActivity(this.prisma, {
        userId: refund.userId,
        action: 'REFUND_REJECTED',
        details: `Admin "${adminName}" declined refund #${refund.refNumber} for application #${refund.application?.refNumber || 'N/A'}. Reason: ${rejectionReason}`,
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

  async updateRefundJourney(
    id: string,
    payload: {
      journey?: Array<{
        title: string;
        description: string;
        time?: string;
        status: 'completed' | 'active' | 'pending';
      }>;
      destinationAccount?: {
        bankName?: string;
        accountNumber?: string;
        referenceNumber?: string;
        expectedDate?: string;
      };
      status?: RefundStatus;
      adminNotes?: string;
      adminName?: string;
    },
  ) {
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

    const updateData: any = {};
    if (payload.journey !== undefined) updateData.journey = payload.journey;
    if (payload.destinationAccount !== undefined) updateData.destinationAccount = payload.destinationAccount;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.adminNotes !== undefined) updateData.adminNotes = payload.adminNotes;
    if (payload.adminName) updateData.processedBy = payload.adminName;
    updateData.updatedAt = new Date();

    const updated = await this.prisma.refundRequest.update({
      where: { id: refund.id },
      data: updateData,
      include: {
        user: { include: { profile: true } },
        application: true,
      },
    });

    try {
      AdminGateway.broadcast('refund_journey_updated', updated);
      AdminGateway.broadcast('refunds_updated', updated);
      AdminGateway.emitToUser(refund.userId, 'refund_journey_updated', updated);
      AdminGateway.emitToUser(refund.userId, 'refunds_updated', updated);
    } catch (wsErr: any) {
      this.logger.warn(`WS broadcast warning on journey update: ${wsErr?.message}`);
    }

    return {
      success: true,
      refund: updated,
    };
  }
}
