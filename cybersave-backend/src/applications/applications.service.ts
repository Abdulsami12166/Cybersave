import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TwilioService } from '../common/services/twilio.service';
import { AdminGateway } from '../admin/admin.gateway';
import { ApplicationStatus } from '@prisma/client';

import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsString()
  serviceSlug?: string;

  @IsString()
  serviceTitle: string;

  @IsOptional()
  formData?: any;

  @IsOptional()
  documents?: Array<{ fileName: string; fileUrl: string }>;

  @IsOptional()
  @IsNumber()
  feePaid?: number;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  razorpayOrderId?: string;

  @IsOptional()
  @IsString()
  razorpayPaymentId?: string;

  @IsOptional()
  @IsString()
  razorpaySignature?: string;
}

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger('ApplicationsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly twilioService: TwilioService,
  ) {}

  private generateRefNumber(): string {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `CSB2026${randomNum}`;
  }

  async createApplication(dto: CreateApplicationDto) {
    const refNumber = this.generateRefNumber();
    const isMongoId = (id?: string) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

    let validUserId = dto.userId;

    const userOrConditions: any[] = [];
    if (validUserId && isMongoId(validUserId)) userOrConditions.push({ id: validUserId });
    if (validUserId && validUserId.includes('@')) userOrConditions.push({ email: validUserId.trim().toLowerCase() });
    if (validUserId && /^\+?[0-9]{10,13}$/.test(validUserId)) userOrConditions.push({ phone: validUserId.trim() });
    if (dto.formData?.email) userOrConditions.push({ email: String(dto.formData.email).trim().toLowerCase() });
    if (dto.formData?.phone) userOrConditions.push({ phone: String(dto.formData.phone).trim() });

    let matchedUser = userOrConditions.length > 0
      ? await this.prisma.user.findFirst({
          where: { OR: userOrConditions },
          include: { profile: true },
        }).catch(() => null)
      : null;

    if (!matchedUser) {
      matchedUser = await this.prisma.user.findFirst({
        include: { profile: true },
      }).catch(() => null);
    }

    if (!matchedUser) {
      const citizenEmail = dto.formData?.email || (validUserId && validUserId.includes('@') ? validUserId : `citizen_${Date.now()}@cybersave.app`);
      matchedUser = await this.prisma.user.create({
        data: {
          email: citizenEmail,
          phone: dto.formData?.phone || (validUserId && /^\+?[0-9]{10,13}$/.test(validUserId) ? validUserId : '+91 98765 43210'),
          role: 'USER',
          profile: {
            create: {
              fullName: dto.formData?.fullName || 'Citizen Applicant',
              email: citizenEmail,
              phone: dto.formData?.phone || '+91 98765 43210',
              state: dto.formData?.stateName || dto.formData?.state || 'Delhi',
              district: dto.formData?.district || 'New Delhi',
              pinCode: dto.formData?.pinCode || '110001',
              address: dto.formData?.address || 'New Delhi, India',
            },
          },
        },
        include: { profile: true },
      });
    }

    validUserId = matchedUser.id;

    let serviceId = dto.serviceId;
    if (!serviceId && dto.serviceSlug) {
      const srv = await this.prisma.service.findUnique({
        where: { slug: dto.serviceSlug },
      }).catch(() => null);
      if (srv) serviceId = srv.id;
    }
    if (!serviceId && dto.serviceTitle) {
      const srv = await this.prisma.service.findFirst({
        where: { title: dto.serviceTitle },
      }).catch(() => null);
      if (srv) serviceId = srv.id;
    }
    if (!serviceId) {
      const firstSrv = await this.prisma.service.findFirst();
      if (firstSrv) {
        serviceId = firstSrv.id;
      } else {
        const createdSrv = await this.prisma.service.create({
          data: {
            slug: (dto.serviceTitle || 'government-service').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            title: dto.serviceTitle || 'Government Service',
            description: 'Government certified service workflow.',
            category: 'Government',
            department: 'General Administration',
            fee: dto.feePaid || 50.0,
            processingTime: '7-15 Days',
            iconName: 'file-document-outline',
            colorHex: '#2563eb',
          },
        });
        serviceId = createdSrv.id;
      }
    }

    // Sanitize documents to ensure clean Cloudinary URLs and metadata
    const sanitizedDocs = (Array.isArray(dto.documents) ? dto.documents : [])
      .filter((d: any) => d && (d.fileUrl || d.url || d.uri || d.fileName || d.label))
      .map((d: any, idx: number) => ({
        label: d.label || `Document ${idx + 1}`,
        fileName: d.fileName || `proof_${idx + 1}.jpg`,
        fileUrl: d.fileUrl || d.url || d.uri || d.path || '',
        type: d.type || 'Identity Proof',
      }));

    const application = await this.prisma.application.create({
      data: {
        refNumber,
        userId: validUserId,
        serviceId: serviceId!,
        serviceTitle: dto.serviceTitle,
        status: ApplicationStatus.SUBMITTED,
        estimatedCompletion: '7-10 Days',
        officialOfficer: 'Officer Sharma (SDM)',
        feePaid: dto.feePaid || 50.0,
        paymentStatus: dto.paymentStatus || 'Success',
        razorpayOrderId: dto.razorpayOrderId,
        razorpayPaymentId: dto.razorpayPaymentId,
        razorpaySignature: dto.razorpaySignature,
        formData: dto.formData || {},
        documents: sanitizedDocs,
      },
      include: {
        user: { include: { profile: true } },
        service: true,
      },
    });

    // Also persist uploaded document proofs to DocumentUpload vault
    if (sanitizedDocs.length > 0) {
      for (const doc of sanitizedDocs) {
        if (doc.fileUrl) {
          await this.prisma.documentUpload.create({
            data: {
              userId: validUserId,
              applicationId: application.id,
              fileName: doc.fileName || doc.label,
              fileUrl: doc.fileUrl,
              fileType: doc.type || 'document',
            },
          }).catch(() => null);
        }
      }
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: validUserId },
        include: { profile: true },
      });

      const phone = user?.phone || user?.profile?.phone;
      if (phone) {
        await this.twilioService.sendSms(
          phone,
          `Cybersave: Your application for ${dto.serviceTitle} (#${refNumber}) has been submitted successfully. Track status in app.`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Notification warning on application creation: ${err.message}`,
      );
    }

    try {
      AdminGateway.broadcast('applications_updated', application);
      AdminGateway.broadcast('new_application_submitted', application);
      AdminGateway.broadcast('application_status_changed', {
        id: application.id,
        refNumber: application.refNumber,
        userId: application.userId,
        status: application.status,
        serviceTitle: application.serviceTitle,
      });

      await AdminGateway.logActivity(this.prisma, {
        userId: application.userId,
        action: 'APPLICATION_SUBMITTED',
        details: `New citizen application #${refNumber} created & submitted for "${dto.serviceTitle}"`,
      });
    } catch (wsErr) {
      this.logger.warn(`WS broadcast error: ${wsErr.message}`);
    }

    return application;
  }

  async getUserApplications(userId?: string, status?: string) {
    const isMongoId = (id?: string) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
    const whereClause: any = {};
    if (status && status !== 'All') {
      const upper = status.toUpperCase().replace(/\s+/g, '_');
      if (
        Object.values(ApplicationStatus).includes(upper as ApplicationStatus)
      ) {
        whereClause.status = upper as ApplicationStatus;
      }
    }

    if (userId && userId !== 'all') {
      const userOrConditions: any[] = [];
      if (isMongoId(userId)) userOrConditions.push({ id: userId });
      userOrConditions.push({ phone: userId }, { email: userId });

      const matchedUser = await this.prisma.user.findFirst({
        where: { OR: userOrConditions },
      }).catch(() => null);

      const targetIds: string[] = [];
      if (isMongoId(userId)) targetIds.push(userId);
      if (matchedUser && isMongoId(matchedUser.id) && !targetIds.includes(matchedUser.id)) {
        targetIds.push(matchedUser.id);
      }

      if (targetIds.length > 0) {
        return this.prisma.application.findMany({
          where: {
            ...whereClause,
            userId: { in: targetIds },
          },
          orderBy: { submittedAt: 'desc' },
          include: { service: true, user: { include: { profile: true } } },
        });
      }

      // User has no applications - return empty array to maintain strict privacy
      return [];
    }
  }

  async getApplicationById(id: string) {
    const isMongoId = (idStr?: string) => typeof idStr === 'string' && /^[0-9a-fA-F]{24}$/.test(idStr);
    const orConditions: any[] = [{ refNumber: id }];
    if (isMongoId(id)) {
      orConditions.push({ id });
    }

    const application = await this.prisma.application.findFirst({
      where: {
        OR: orConditions,
      },
      include: { 
        service: true,
        user: { include: { profile: true } },
        documentUploads: true,
      },
    });

    if (!application) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    return application;
  }

  async updateStatus(id: string, status: string, rejectionReason?: string) {
    const isMongoId = (idStr?: string) => typeof idStr === 'string' && /^[0-9a-fA-F]{24}$/.test(idStr);
    const orConditions: any[] = [{ refNumber: id }];
    if (isMongoId(id)) {
      orConditions.push({ id });
    }

    const app = await this.prisma.application.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    const validStatusMap: Record<string, ApplicationStatus> = {
      APPROVED: ApplicationStatus.APPROVED,
      approved: ApplicationStatus.APPROVED,
      REJECTED: ApplicationStatus.REJECTED,
      rejected: ApplicationStatus.REJECTED,
      IN_PROGRESS: ApplicationStatus.IN_PROGRESS,
      'in progress': ApplicationStatus.IN_PROGRESS,
      VERIFYING: ApplicationStatus.VERIFYING,
      verifying: ApplicationStatus.VERIFYING,
      SUBMITTED: ApplicationStatus.SUBMITTED,
      submitted: ApplicationStatus.SUBMITTED,
      COMPLETED: ApplicationStatus.COMPLETED,
      completed: ApplicationStatus.COMPLETED,
    };

    const targetStatus = validStatusMap[status] || (status as ApplicationStatus);

    const updated = await this.prisma.application.update({
      where: { id: app.id },
      data: {
        status: targetStatus,
        rejectionReason: targetStatus === ApplicationStatus.REJECTED ? (rejectionReason || 'Application rejected during administrative verification.') : null,
        updatedAt: new Date(),
      },
      include: {
        user: { include: { profile: true } },
        service: true,
      },
    });

    try {
      AdminGateway.broadcast('applications_updated', updated);
      AdminGateway.broadcast('application_status_changed', updated);

      let auditAct = `APPLICATION_${targetStatus}`;
      let auditDet = `Application #${updated.refNumber} (${updated.serviceTitle}) status transitioned to ${targetStatus}`;
      if (targetStatus === ApplicationStatus.APPROVED) {
        auditAct = 'APPLICATION_APPROVED';
        auditDet = `Application #${updated.refNumber} (${updated.serviceTitle}) verified & APPROVED by officer. Digital certificate authorization issued.`;
      } else if (targetStatus === ApplicationStatus.REJECTED) {
        auditAct = 'APPLICATION_REJECTED';
        auditDet = `Application #${updated.refNumber} (${updated.serviceTitle}) REJECTED by officer. Reason: ${rejectionReason || 'Document verification issue'}`;
      }

      await AdminGateway.logActivity(this.prisma, {
        userId: updated.userId,
        action: auditAct,
        details: auditDet,
      });
    } catch (wsErr) {
      this.logger.warn(`WS broadcast error: ${wsErr.message}`);
    }

    try {
      const phone = updated.user?.phone || updated.user?.profile?.phone;
      if (phone) {
        const msg = targetStatus === ApplicationStatus.APPROVED
          ? `Cybersave: Your application for ${updated.serviceTitle} (#${updated.refNumber}) has been APPROVED.`
          : targetStatus === ApplicationStatus.REJECTED
            ? `Cybersave: Your application for ${updated.serviceTitle} (#${updated.refNumber}) has been REJECTED. Reason: ${rejectionReason || 'Document verification issue'}.`
            : `Cybersave: Your application for ${updated.serviceTitle} (#${updated.refNumber}) status changed to ${targetStatus}.`;
        await this.twilioService.sendSms(phone, msg);
      }
    } catch (e) {
      this.logger.warn(`SMS notification warning: ${e.message}`);
    }

    return updated;
  }

  async assignOperator(id: string, operatorName: string, operatorId?: string) {
    const isMongoId = (idStr?: string) => typeof idStr === 'string' && /^[0-9a-fA-F]{24}$/.test(idStr);
    const orConditions: any[] = [{ refNumber: id }];
    if (isMongoId(id)) {
      orConditions.push({ id });
    }

    const app = await this.prisma.application.findFirst({
      where: { OR: orConditions },
    });

    if (!app) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    const updated = await this.prisma.application.update({
      where: { id: app.id },
      data: {
        officialOfficer: operatorName,
        updatedAt: new Date(),
      },
      include: {
        user: { include: { profile: true } },
        service: true,
      },
    });

    await AdminGateway.logActivity(this.prisma, {
      userId: app.userId,
      action: 'APPLICATION_ASSIGNED',
      details: `Application #${app.refNumber} (${app.serviceTitle || 'Citizen Application'}) assigned to verification officer: ${operatorName}`,
    });

    try {
      AdminGateway.broadcast('applications_updated', updated);
      AdminGateway.broadcast('application_assigned', { applicationId: app.id, assignedTo: operatorName });
    } catch (wsErr) {
      this.logger.warn(`WS broadcast error: ${wsErr.message}`);
    }

    return {
      success: true,
      message: `Application successfully assigned to ${operatorName}`,
      application: updated,
    };
  }
}
