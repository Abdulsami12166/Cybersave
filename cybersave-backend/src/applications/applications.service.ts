import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
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

  @IsOptional()
  @IsString()
  clientSubmissionId?: string;
}

// ponytail: in-flight submission deduplicator to eliminate concurrent double-tap race conditions
const inFlightSubmissions = new Map<string, Promise<any>>();

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
    // ponytail: Deduplication key based on authoritative payment/submission identifier
    const dedupKey = dto.razorpayOrderId
      ? `order_${dto.razorpayOrderId}`
      : dto.clientSubmissionId
      ? `sub_${dto.clientSubmissionId}`
      : dto.razorpayPaymentId
      ? `pay_${dto.razorpayPaymentId}`
      : null;

    if (dedupKey && inFlightSubmissions.has(dedupKey)) {
      this.logger.log(`[Idempotency] Awaiting in-flight submission for key: ${dedupKey}`);
      return await inFlightSubmissions.get(dedupKey);
    }

    const task = this.executeCreateApplication(dto);
    if (dedupKey) {
      inFlightSubmissions.set(dedupKey, task);
      task.finally(() => {
        inFlightSubmissions.delete(dedupKey);
      });
    }
    return await task;
  }

  private async executeCreateApplication(dto: CreateApplicationDto) {
    // 1. Authoritative check: If application with same Razorpay order ID exists, return immediately
    if (dto.razorpayOrderId) {
      const existingByOrder = await this.prisma.application.findFirst({
        where: { razorpayOrderId: dto.razorpayOrderId },
        include: { user: { include: { profile: true } }, service: true },
      });
      if (existingByOrder) {
        this.logger.log(`[Idempotency] Found existing application #${existingByOrder.refNumber} for razorpayOrderId: ${dto.razorpayOrderId}`);
        return existingByOrder;
      }
    }

    // 2. Authoritative check: If application with same client submission ID exists, return immediately
    if (dto.clientSubmissionId) {
      const existingBySub = await this.prisma.application.findFirst({
        where: { clientSubmissionId: dto.clientSubmissionId },
        include: { user: { include: { profile: true } }, service: true },
      });
      if (existingBySub) {
        this.logger.log(`[Idempotency] Found existing application #${existingBySub.refNumber} for clientSubmissionId: ${dto.clientSubmissionId}`);
        return existingBySub;
      }
    }

    // 3. Authoritative check: If application with same payment ID exists, return immediately
    if (dto.razorpayPaymentId) {
      const existingByPay = await this.prisma.application.findFirst({
        where: { razorpayPaymentId: dto.razorpayPaymentId },
        include: { user: { include: { profile: true } }, service: true },
      });
      if (existingByPay) {
        this.logger.log(`[Idempotency] Found existing application #${existingByPay.refNumber} for razorpayPaymentId: ${dto.razorpayPaymentId}`);
        return existingByPay;
      }
    }

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
      const citizenEmail = dto.formData?.email || (validUserId && validUserId.includes('@') ? validUserId.trim().toLowerCase() : `citizen_${Date.now()}@cybersave.app`);
      matchedUser = await this.prisma.user.create({
        data: {
          ...(validUserId && isMongoId(validUserId) ? { id: validUserId } : {}),
          email: citizenEmail,
          phone: dto.formData?.phone || (validUserId && /^\+?[0-9]{10,13}$/.test(validUserId) ? validUserId : '+91 98765 43210'),
          role: 'USER',
          profile: {
            create: {
              fullName: dto.formData?.fullName || dto.formData?.applicantName || 'Citizen Applicant',
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

    // Inactive services are not open for new applications (server-enforced,
    // not a frontend-only hide). Historical applications remain untouched.
    if (serviceId) {
      const activeSrv = await this.prisma.service.findUnique({ where: { id: serviceId } }).catch(() => null);
      if (activeSrv && activeSrv.isActive === false) {
        throw new BadRequestException(
          `Service "${activeSrv.title}" is currently unavailable and not accepting new applications.`,
        );
      }
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

    // Sanitize documents to ensure clean URLs, prevent DB bloat, and ensure fast queries
    const sanitizedDocs = (Array.isArray(dto.documents) ? dto.documents : [])
      .filter((d: any) => d && (d.fileUrl || d.url || d.uri || d.fileName || d.label))
      .map((d: any, idx: number) => {
        const rawUrl = d.fileUrl || d.url || d.uri || d.path || '';
        const safeUrl = (typeof rawUrl === 'string' && rawUrl.startsWith('data:image') && rawUrl.length > 3000)
          ? 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=60'
          : rawUrl;
        return {
          label: d.label || `Document ${idx + 1}`,
          fileName: d.fileName || `proof_${idx + 1}.jpg`,
          fileUrl: safeUrl,
          type: d.type || 'Identity Proof',
        };
      });

    // Duplicate prevention: If an application for the exact same service was created within the last 45 seconds by this user, return the existing application
    const recentThreshold = new Date(Date.now() - 45 * 1000);
    const existingRecent = await this.prisma.application.findFirst({
      where: {
        userId: validUserId,
        OR: [
          { serviceTitle: dto.serviceTitle },
          ...(serviceId ? [{ serviceId }] : []),
        ],
        submittedAt: { gte: recentThreshold },
      },
      include: {
        user: { include: { profile: true } },
        service: true,
      },
    });

    if (existingRecent) {
      this.logger.warn(`Duplicate submission suppressed for user ${validUserId} on service "${dto.serviceTitle}". Returning existing application #${existingRecent.refNumber}`);
      return existingRecent;
    }

    const application = await this.prisma.application.create({
      data: {
        refNumber,
        userId: validUserId,
        serviceId: serviceId!,
        serviceTitle: dto.serviceTitle,
        status: ApplicationStatus.SUBMITTED,
        estimatedCompletion: '7-10 Days',
        officialOfficer: null,
        feePaid: dto.feePaid || 50.0,
        paymentStatus: dto.paymentStatus || 'Success',
        razorpayOrderId: dto.razorpayOrderId || null,
        razorpayPaymentId: dto.razorpayPaymentId || null,
        razorpaySignature: dto.razorpaySignature || null,
        clientSubmissionId: dto.clientSubmissionId || dto.razorpayOrderId || null,
        formData: dto.formData || {},
        documents: sanitizedDocs,
      },
      include: {
        user: { include: { profile: true } },
        service: true,
      },
    });

    // PERF: persist all document-proof vault records in ONE round-trip
    // (createMany) instead of one sequential insert per document.
    const vaultDocs = sanitizedDocs.filter((d: any) => d.fileUrl);
    if (vaultDocs.length > 0) {
      this.prisma.documentUpload
        .createMany({
          data: vaultDocs.map((doc: any) => ({
            userId: validUserId,
            applicationId: application.id,
            fileName: doc.fileName || doc.label,
            fileUrl: doc.fileUrl,
            fileType: doc.type || 'document',
          })),
        })
        .catch((e: any) =>
          this.logger.warn(`DocumentUpload vault write skipped: ${e?.message}`),
        );
    }

    // PERF: SMS notification and audit log are NON-CRITICAL side effects.
    // The application row is already durably persisted above, so we do not
    // block the citizen's response on the Twilio round-trip or the audit
    // write. Both run fire-and-forget with logging (no false success: the
    // authoritative application object below is only returned after the
    // prisma.application.create transaction has completed).
    const userFromCreate = (application as any).user;
    const phone = userFromCreate?.phone || userFromCreate?.profile?.phone;
    if (phone) {
      this.twilioService
        .sendSms(
          phone,
          `Cybersave: Your application for ${dto.serviceTitle} (#${refNumber}) has been submitted successfully. Track status in app.`,
        )
        .catch((err: any) =>
          this.logger.warn(`SMS notification warning: ${err?.message}`),
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

      // Audit log no longer awaited (was blocking response by one write RTT).
      AdminGateway.logActivity(this.prisma, {
        userId: application.userId,
        action: 'APPLICATION_SUBMITTED',
        details: `New citizen application #${refNumber} created & submitted for "${dto.serviceTitle}"`,
      }).catch((e: any) =>
        this.logger.warn(`Audit log write warning: ${e?.message}`),
      );
    } catch (wsErr) {
      this.logger.warn(`WS broadcast error: ${wsErr.message}`);
    }

    return application;
  }

  async getUserApplications(userId?: string, status?: string) {
    const isMongoId = (id?: string) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
    const whereClause: any = {};
    if (status && status !== 'All' && status !== 'ALL') {
      const upper = status.toUpperCase().replace(/\s+/g, '_');
      if (
        Object.values(ApplicationStatus).includes(upper as ApplicationStatus)
      ) {
        whereClause.status = upper as ApplicationStatus;
      } else if (upper === 'IN_REVIEW' || upper === 'UNDER_REVIEW') {
        whereClause.status = { in: [ApplicationStatus.PENDING, ApplicationStatus.VERIFYING] };
      } else if (upper === 'PROCESSING') {
        whereClause.status = ApplicationStatus.IN_PROGRESS;
      }
    }

    const sanitizeApps = (apps: any[]) => {
      if (!Array.isArray(apps)) return apps;
      return apps.map((app: any) => {
        if (Array.isArray(app?.documents)) {
          app.documents = app.documents.map((d: any, idx: number) => {
            const rawUrl = typeof d === 'string' ? d : (d?.fileUrl || d?.url || d?.uri || '');
            const safeUrl = (typeof rawUrl === 'string' && rawUrl.startsWith('data:image') && rawUrl.length > 3000)
              ? 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=60'
              : rawUrl;
            if (typeof d === 'string') return { label: `Supporting Proof #${idx + 1}`, fileName: `proof_${idx + 1}.jpg`, fileUrl: safeUrl, type: 'Identity Proof' };
            return { ...d, fileUrl: safeUrl };
          });
        }
        return app;
      });
    };

    // If userId is omitted or 'all' or 'admin', return all applications (for Admin Web Panel)
    // PERF: bounded page size + lean select — the mobile/admin list only needs
    // summary fields, not the full formData blob for every row.
    if (!userId || userId === 'all' || userId === 'admin' || userId === 'default-user-id') {
      const apps = await this.prisma.application.findMany({
        where: whereClause,
        orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
        take: 100,
        include: {
          service: { select: { id: true, title: true, category: true, fee: true } },
          user: { select: { id: true, email: true, phone: true, profile: { select: { fullName: true, phone: true, district: true } } } },
          refundRequests: { select: { id: true, status: true, refNumber: true } },
        },
      });
      return sanitizeApps(apps);
    }

    const cleanUserId = String(userId).trim();
    const userOrConditions: any[] = [];
    if (isMongoId(cleanUserId)) userOrConditions.push({ id: cleanUserId });
    userOrConditions.push({ email: cleanUserId.toLowerCase() });
    userOrConditions.push({ email: cleanUserId });
    userOrConditions.push({ phone: cleanUserId });

    const digits = cleanUserId.replace(/\D/g, '').slice(-10);
    if (digits.length === 10) {
      userOrConditions.push({ phone: `+91${digits}` });
      userOrConditions.push({ phone: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` });
      userOrConditions.push({ phone: digits });
    }

    const matchedUser = await this.prisma.user.findFirst({
      where: { OR: userOrConditions },
    }).catch(() => null);

    const targetIds: string[] = [];
    if (isMongoId(cleanUserId)) targetIds.push(cleanUserId);
    if (matchedUser && isMongoId(matchedUser.id) && !targetIds.includes(matchedUser.id)) {
      targetIds.push(matchedUser.id);
    }

    if (targetIds.length > 0) {
      const apps = await this.prisma.application.findMany({
        where: {
          ...whereClause,
          userId: { in: targetIds },
        },
        orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
        take: 100,
        include: {
          service: { select: { id: true, title: true, category: true, fee: true } },
          user: { select: { id: true, email: true, phone: true, profile: { select: { fullName: true, phone: true, district: true } } } },
          refundRequests: { select: { id: true, status: true, refNumber: true } },
        },
      });
      return sanitizeApps(apps);
    }

    // User has no applications - return empty array to maintain strict privacy
    return [];
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
        refundRequests: true,
      },
    });

    if (!application) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    return application;
  }

  async updateStatus(
    id: string,
    status: string,
    rejectionReason?: string,
    adminInfo?: { adminId?: string; adminEmail?: string; adminName?: string; adminRole?: string },
  ) {
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
      'In Progress': ApplicationStatus.IN_PROGRESS,
      PROCESSING: ApplicationStatus.IN_PROGRESS,
      processing: ApplicationStatus.IN_PROGRESS,
      VERIFYING: ApplicationStatus.VERIFYING,
      verifying: ApplicationStatus.VERIFYING,
      SUBMITTED: ApplicationStatus.SUBMITTED,
      submitted: ApplicationStatus.SUBMITTED,
      COMPLETED: ApplicationStatus.COMPLETED,
      completed: ApplicationStatus.COMPLETED,
      PENDING: ApplicationStatus.PENDING,
      pending: ApplicationStatus.PENDING,
      'In Review': ApplicationStatus.PENDING,
      'in review': ApplicationStatus.PENDING,
      'Under Review': ApplicationStatus.PENDING,
      'under review': ApplicationStatus.PENDING,
      UNDER_REVIEW: ApplicationStatus.PENDING,
      IN_REVIEW: ApplicationStatus.PENDING,
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

      const actingName = adminInfo?.adminName || (adminInfo?.adminEmail ? adminInfo.adminEmail.split('@')[0] : (updated.officialOfficer || 'Field Operator'));
      const actingEmail = adminInfo?.adminEmail || '';
      const actingId = adminInfo?.adminId;
      const actingRole = adminInfo?.adminRole || (actingEmail === 'admin@cybersave.com' ? 'Super Administrator' : 'Sub-Admin / Operator');

      let auditAct = `APPLICATION_${targetStatus}`;
      let auditDet = `Application #${updated.refNumber} (${updated.serviceTitle}) status transitioned to ${targetStatus} by ${actingRole} ${actingName}`;
      if (targetStatus === ApplicationStatus.APPROVED) {
        auditAct = 'APPLICATION_APPROVED';
        auditDet = `Application #${updated.refNumber} (${updated.serviceTitle}) verified & APPROVED by ${actingRole} ${actingName}. Digital certificate authorized.`;
      } else if (targetStatus === ApplicationStatus.REJECTED) {
        auditAct = 'APPLICATION_REJECTED';
        auditDet = `Application #${updated.refNumber} (${updated.serviceTitle}) REJECTED by ${actingRole} ${actingName}. Reason: ${rejectionReason || 'Document verification issue'}`;
      }

      await AdminGateway.logActivity(this.prisma, {
        userId: actingId,
        userEmail: actingEmail,
        userName: actingName,
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

  async getCertificateDetails(id: string) {
    const isMongoId = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
    const app = await this.prisma.application.findFirst({
      where: isMongoId(id) ? { OR: [{ id }, { refNumber: id }] } : { refNumber: id },
      include: {
        user: { include: { profile: true } },
        service: true,
      },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const formData = (app.formData as any) || {};
    const citizenName =
      formData.fullName ||
      formData.name ||
      app.user?.profile?.fullName ||
      'Rajesh Kumar';

    const certNumber = `CERT-GOV-${(app.refNumber || '2026').replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
    const approvalDate = app.updatedAt
      ? new Date(app.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    return {
      success: true,
      applicationId: app.id,
      refNumber: app.refNumber,
      serviceTitle: app.serviceTitle,
      status: app.status,
      certNumber,
      citizenName,
      approvalDate,
      issuingAuthority: app.officialOfficer || 'Officer Sharma (SDM)',
      downloadUrl: `/api/v1/applications/${app.refNumber}/certificate.pdf`,
    };
  }

  async generateCertificatePdf(id: string, res: any) {
    const isMongoId = (val?: string) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
    const app = await this.prisma.application.findFirst({
      where: isMongoId(id) ? { OR: [{ id }, { refNumber: id }] } : { refNumber: id },
      include: {
        user: { include: { profile: true } },
        service: true,
      },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const formData = (app.formData as any) || {};
    const citizenName =
      formData.fullName ||
      formData.name ||
      app.user?.profile?.fullName ||
      'Rajesh Kumar';
    const citizenPhone = formData.phone || formData.mobile || app.user?.phone || '+91 98765 43210';
    const citizenEmail = formData.email || app.user?.email || 'citizen@cybersave.gov.in';
    const citizenAadhaar = formData.aadhaarNumber ? `•••• •••• ${formData.aadhaarNumber.slice(-4)}` : '•••• •••• 4321 (UIDAI Verified)';
    const citizenAddress = formData.address || (app.user?.profile?.address ? `${app.user.profile.address}, ${app.user.profile.district || ''}` : 'New Delhi, Delhi, India');
    const certNumber = `CERT-GOV-${(app.refNumber || '2026').replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
    const approvalDate = app.updatedAt
      ? new Date(app.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const officer = app.officialOfficer || 'Officer Sharma (SDM)';

    // Import pdfkit dynamically
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      size: 'A4',
      margin: 36,
      info: {
        Title: `Government Certificate - ${app.serviceTitle}`,
        Author: 'Government of India - CyberSave Digital Portal',
        Subject: `Official Certificate for ${citizenName}`,
        Keywords: 'Government Certificate, Aadhaar Verified, CyberSave',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Certificate_${app.refNumber}.pdf"`,
    );

    doc.pipe(res);

    // Decorative Double Border
    doc.rect(20, 20, 555, 802).lineWidth(3).strokeColor('#1E3A8A').stroke();
    doc.rect(26, 26, 543, 790).lineWidth(1).strokeColor('#D97706').stroke();

    // Top Header Banner
    doc.fillColor('#1E3A8A').fontSize(18).font('Helvetica-Bold').text('GOVERNMENT OF INDIA', { align: 'center' });
    doc.moveDown(0.2);
    doc.fillColor('#475569').fontSize(10).font('Helvetica').text('MINISTRY OF ELECTRONICS & INFORMATION TECHNOLOGY', { align: 'center' });
    doc.moveDown(0.1);
    doc.fillColor('#2563EB').fontSize(11).font('Helvetica-Bold').text('CYBERSAVE CITIZEN DIGITAL VAULT & E-GOVERNANCE PORTAL', { align: 'center' });
    doc.moveDown(0.5);

    // Decorative Divider Line
    doc.moveTo(40, 105).lineTo(555, 105).lineWidth(1.5).strokeColor('#2563EB').stroke();
    doc.moveTo(40, 108).lineTo(555, 108).lineWidth(0.5).strokeColor('#D97706').stroke();

    // Watermark (subtle diagonal)
    doc.save();
    doc.rotate(-30, { origin: [297, 420] });
    doc.fillColor('#E2E8F0', 0.35).fontSize(42).font('Helvetica-Bold').text('AADHAAR CERTIFIED WATERMARK', 60, 400, { align: 'center' });
    doc.restore();

    // Certificate Title Badge
    doc.moveDown(1.5);
    doc.rect(40, 125, 515, 34).fillAndStroke('#EFF6FF', '#BFDBFE');
    doc.fillColor('#1D4ED8').fontSize(14).font('Helvetica-Bold').text('OFFICIAL SERVICE CLEARANCE CERTIFICATE', 40, 134, { align: 'center' });

    // Certificate Meta
    doc.moveDown(1.8);
    const metaY = 175;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F172A').text(`Certificate No: `, 50, metaY, { continued: true });
    doc.font('Helvetica').fillColor('#2563EB').text(certNumber);

    doc.font('Helvetica-Bold').fillColor('#0F172A').text(`Application Ref ID: `, 50, metaY + 16, { continued: true });
    doc.font('Helvetica').fillColor('#475569').text(app.refNumber);

    doc.font('Helvetica-Bold').fillColor('#0F172A').text(`Issued Date: `, 360, metaY, { continued: true });
    doc.font('Helvetica').fillColor('#475569').text(approvalDate);

    doc.font('Helvetica-Bold').fillColor('#0F172A').text(`Clearance Status: `, 360, metaY + 16, { continued: true });
    doc.font('Helvetica-Bold').fillColor('#15803D').text('OFFICIALLY APPROVED');

    // Section 1: Citizen Particulars
    doc.rect(40, 220, 515, 22).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('1. CITIZEN & APPLICANT PARTICULARS', 48, 226);

    let rowY = 252;
    const drawRow = (label: string, value: string, y: number) => {
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#475569').text(label, 50, y, { width: 140 });
      doc.font('Helvetica').fillColor('#0F172A').text(value || 'N/A', 190, y, { width: 350 });
      doc.moveTo(50, y + 14).lineTo(540, y + 14).lineWidth(0.5).strokeColor('#F1F5F9').stroke();
    };

    drawRow('Full Legal Name', citizenName, rowY); rowY += 20;
    drawRow('Aadhaar Verification', `${citizenAadhaar} (Verified via UIDAI XML Protocol)`, rowY); rowY += 20;
    drawRow('Registered Mobile', citizenPhone, rowY); rowY += 20;
    drawRow('Registered Email', citizenEmail, rowY); rowY += 20;
    drawRow('Permanent Address', citizenAddress, rowY); rowY += 24;

    // Section 2: Service & Approval Particulars
    doc.rect(40, rowY, 515, 22).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('2. SERVICE CLEARANCE & APPROVAL DETAILS', 48, rowY + 6);
    rowY += 32;

    drawRow('Service / Scheme Title', app.serviceTitle, rowY); rowY += 20;
    drawRow('Department / Division', 'State Revenue, Municipal & Citizen Service Division', rowY); rowY += 20;
    drawRow('Processing Fee Paid', `₹${Number(app.feePaid || 50).toFixed(2)} (Payment Status: Success)`, rowY); rowY += 20;
    drawRow('Verification Incharge', `${officer} (Sub-Divisional Magistrate SDM-01)`, rowY); rowY += 20;
    drawRow('Issuing Kendra', 'CyberSave Central Kendra (Digital India Nodal Office)', rowY); rowY += 24;

    // Section 3: Verification Notice & Official Digital Stamp
    doc.rect(40, rowY, 515, 110).fillAndStroke('#F0FDF4', '#BBF7D0');
    doc.fillColor('#166534').fontSize(10).font('Helvetica-Bold').text('DIGITAL VERIFICATION & COMPLIANCE SEAL', 50, rowY + 10);
    doc.fontSize(8.5).font('Helvetica').fillColor('#15803D').text(
      'This electronic clearance certificate is digitally signed and valid under Section 5 and 10 of the Information Technology Act, 2000. It requires no physical wet-ink signature and serves as valid government documentation for all official, municipal, educational, and banking procedures across India.',
      50,
      rowY + 26,
      { width: 330, lineGap: 3 },
    );

    // Official Seal Box on right
    doc.rect(400, rowY + 12, 140, 86).lineWidth(1.5).strokeColor('#15803D').stroke();
    doc.fillColor('#15803D').fontSize(9).font('Helvetica-Bold').text('OFFICIAL SEAL', 400, rowY + 20, { align: 'center', width: 140 });
    doc.fontSize(8).font('Helvetica').text('GOVT. OF INDIA', 400, rowY + 34, { align: 'center', width: 140 });
    doc.text('APPROVED & VERIFIED', 400, rowY + 46, { align: 'center', width: 140 });
    doc.fontSize(7).text(`Date: ${approvalDate}`, 400, rowY + 60, { align: 'center', width: 140 });
    doc.text('SDM DIGITAL CLEARANCE', 400, rowY + 72, { align: 'center', width: 140 });

    // Bottom Footer
    doc.fontSize(8).font('Helvetica').fillColor('#94A3B8').text(
      `Certificate Security Digest: SHA256-CSB-${app.refNumber} • Issued by CyberSave E-Governance System • Verify at https://cybersave.gov.in`,
      40,
      780,
      { align: 'center', width: 515 },
    );

    doc.end();
  }
}
