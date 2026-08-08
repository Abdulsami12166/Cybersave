import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserDocuments(userId: string) {
    return this.prisma.documentUpload.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async createDocument(userId: string, data: { fileName: string; fileUrl: string; fileType?: string; fileSize?: number; applicationId?: string }) {
    return this.prisma.documentUpload.create({
      data: {
        userId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileType: data.fileType || 'application/pdf',
        fileSize: data.fileSize || 1024 * 500,
        applicationId: data.applicationId,
      },
    });
  }

  async deleteDocument(userId: string, id: string) {
    const doc = await this.prisma.documentUpload.findFirst({
      where: { id, userId },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    return this.prisma.documentUpload.delete({
      where: { id },
    });
  }

  async getStorageUsage(userId: string) {
    const docs = await this.prisma.documentUpload.findMany({
      where: { userId },
      select: { fileSize: true },
    });
    const usedBytes = docs.reduce((acc, d) => acc + (d.fileSize || 0), 0);
    const totalAllowedBytes = 10 * 1024 * 1024 * 1024; // 10 GB limit
    return {
      usedBytes,
      totalAllowedBytes,
      usedMB: (usedBytes / (1024 * 1024)).toFixed(2),
      usedGB: (usedBytes / (1024 * 1024 * 1024)).toFixed(2),
      formattedUsed: usedBytes > 1024 * 1024 * 1024 
        ? `${(usedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB` 
        : `${(usedBytes / (1024 * 1024)).toFixed(1)} MB`,
      documentCount: docs.length,
    };
  }
}
