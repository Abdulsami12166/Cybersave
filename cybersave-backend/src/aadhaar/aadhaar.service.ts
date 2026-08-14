import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SandboxService } from '../sandbox/sandbox.service';

@Injectable()
export class AadhaarService {
  constructor(
    private prisma: PrismaService,
    private sandboxService: SandboxService,
  ) {}

  async sendOkycOtp(userId: string, aadhaarNumber: string, consent: string) {
    if (consent !== 'Y') {
      throw new BadRequestException(
        'User consent is required for Aadhaar OKYC',
      );
    }

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'AADHAAR_OTP_INITIATED',
        details: 'Started Sandbox OKYC flow',
      },
    });

    return this.sandboxService.sendAadhaarOtp(aadhaarNumber, consent);
  }

  async verifyOkycOtp(userId: string, referenceId: string, otp: string) {
    const result = await this.sandboxService.verifyAadhaarOtp(referenceId, otp);

    if (result.success && result.data.kyc) {
      // Save minimal verification data to DB
      const doc = await this.prisma.aadhaarDocument.create({
        data: {
          userId,
          referenceId: String(referenceId),
          verificationStatus: 'VERIFIED',
          verificationMethod: 'SANDBOX_OKYC',
          name: result.data.kyc.name,
          gender: result.data.kyc.gender,
          dateOfBirth: result.data.kyc.dateOfBirth,
          address: result.data.kyc.address,
          verifiedAt: new Date(),
        },
      });

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'AADHAAR_OTP_VERIFIED',
          details: `Successfully verified Aadhaar doc ${doc.id}`,
        },
      });
    }

    return result;
  }

  async getUserDocuments(userId: string) {
    return this.prisma.aadhaarDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteDocument(userId: string, id: string) {
    const doc = await this.prisma.aadhaarDocument.findFirst({
      where: { id, userId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    await this.prisma.aadhaarDocument.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'AADHAAR_DOC_DELETED',
        details: `Deleted Aadhaar doc ${id}`,
      },
    });
    return { success: true };
  }
}
