import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TwilioService } from '../common/services/twilio.service';
import { FirebaseService } from '../common/services/firebase.service';
import { ApplicationStatus } from '@prisma/client';

export class CreateApplicationDto {
  userId: string;
  serviceId?: string;
  serviceSlug?: string;
  serviceTitle: string;
  formData: any;
  documents?: Array<{ fileName: string; fileUrl: string }>;
  feePaid?: number;
}

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger('ApplicationsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly twilioService: TwilioService,
    private readonly firebaseService: FirebaseService,
  ) {}

  private generateRefNumber(): string {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `CSB2026${randomNum}`;
  }

  async createApplication(dto: CreateApplicationDto) {
    const refNumber = this.generateRefNumber();

    let serviceId = dto.serviceId;
    if (!serviceId && dto.serviceSlug) {
      const srv = await this.prisma.service.findUnique({ where: { slug: dto.serviceSlug } });
      if (srv) serviceId = srv.id;
    }
    if (!serviceId) {
      const firstSrv = await this.prisma.service.findFirst();
      serviceId = firstSrv?.id || 'default-service-id';
    }

    const application = await this.prisma.application.create({
      data: {
        refNumber,
        userId: dto.userId,
        serviceId,
        serviceTitle: dto.serviceTitle,
        status: ApplicationStatus.IN_PROGRESS,
        estimatedCompletion: '7-10 Days',
        officialOfficer: 'Officer Sharma (SDM)',
        feePaid: dto.feePaid || 50.0,
        paymentStatus: 'Success',
        formData: dto.formData || {},
        documents: dto.documents || [],
      },
    });

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        include: { profile: true },
      });

      const phone = user?.phone || user?.profile?.phone;
      if (phone) {
        await this.twilioService.sendSms(
          phone,
          `Cybersave: Your application for ${dto.serviceTitle} (#${refNumber}) has been submitted successfully. Track status in app.`,
        );
      }

      await this.firebaseService.sendPushNotification(
        'user-fcm-token',
        'Application Submitted!',
        `Your request for ${dto.serviceTitle} (${refNumber}) is now under processing.`,
        { refNumber },
      );
    } catch (err) {
      this.logger.warn(`Notification warning on application creation: ${err.message}`);
    }

    return application;
  }

  async getUserApplications(userId: string, status?: string) {
    const whereClause: any = { userId };
    if (status && status !== 'All') {
      const upper = status.toUpperCase().replace(/\s+/g, '_');
      if (Object.values(ApplicationStatus).includes(upper as ApplicationStatus)) {
        whereClause.status = upper as ApplicationStatus;
      }
    }

    return this.prisma.application.findMany({
      where: whereClause,
      orderBy: { submittedAt: 'desc' },
      include: { service: true },
    });
  }

  async getApplicationById(id: string) {
    const application = await this.prisma.application.findFirst({
      where: {
        OR: [{ id }, { refNumber: id }],
      },
      include: { service: true },
    });

    if (!application) {
      throw new NotFoundException(`Application ${id} not found`);
    }

    return application;
  }
}
