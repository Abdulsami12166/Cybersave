import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaService');

  async onModuleInit() {
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        await this.$connect();
        this.logger.log('Prisma connected to PostgreSQL database successfully.');

        // Automatic Table Schema Verification & Creation
        try {
          const tableQueries = [
            `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT PRIMARY KEY, "phone" TEXT UNIQUE, "email" TEXT UNIQUE, "firebaseUid" TEXT UNIQUE, "passwordHash" TEXT, "role" TEXT DEFAULT 'USER', "fcmToken" TEXT, "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP, "deletedAt" TIMESTAMP(3));`,
            `CREATE TABLE IF NOT EXISTS "Profile" ("id" TEXT PRIMARY KEY, "userId" TEXT UNIQUE NOT NULL, "fullName" TEXT, "phone" TEXT, "email" TEXT, "avatarUrl" TEXT, "address" TEXT, "district" TEXT, "state" TEXT, "pinCode" TEXT, "dob" TEXT, "gender" TEXT, "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);`,
            `CREATE TABLE IF NOT EXISTS "Service" ("id" TEXT PRIMARY KEY, "slug" TEXT UNIQUE NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "category" TEXT NOT NULL, "department" TEXT NOT NULL, "fee" DOUBLE PRECISION NOT NULL DEFAULT 0, "processingTime" TEXT NOT NULL, "eligibility" JSONB, "requiredDocs" JSONB, "isActive" BOOLEAN NOT NULL DEFAULT true, "iconName" TEXT, "colorHex" TEXT, "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);`,
            `CREATE TABLE IF NOT EXISTS "Application" ("id" TEXT PRIMARY KEY, "refNumber" TEXT UNIQUE NOT NULL, "userId" TEXT NOT NULL, "serviceId" TEXT NOT NULL, "serviceTitle" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'SUBMITTED', "rejectionReason" TEXT, "estimatedCompletion" TEXT, "officialOfficer" TEXT DEFAULT 'Officer Sharma (SDM)', "feePaid" DOUBLE PRECISION DEFAULT 50.0, "paymentStatus" TEXT DEFAULT 'Success', "formData" JSONB, "documents" JSONB, "submittedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);`,
            `CREATE TABLE IF NOT EXISTS "Wallet" ("id" TEXT PRIMARY KEY, "userId" TEXT UNIQUE NOT NULL, "balance" DOUBLE PRECISION NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);`,
            `CREATE TABLE IF NOT EXISTS "WalletTransaction" ("id" TEXT PRIMARY KEY, "walletId" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL DEFAULT 'CREDIT', "title" TEXT NOT NULL, "subtitle" TEXT, "amount" DOUBLE PRECISION NOT NULL, "refId" TEXT, "status" TEXT DEFAULT 'SUCCESS', "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);`,
            `CREATE TABLE IF NOT EXISTS "DocumentUpload" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "applicationId" TEXT, "fileUrl" TEXT NOT NULL, "fileName" TEXT NOT NULL, "fileType" TEXT, "fileSize" INTEGER, "uploadedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);`,
            `CREATE TABLE IF NOT EXISTS "Notification" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "type" TEXT DEFAULT 'APPLICATION_UPDATE', "status" TEXT DEFAULT 'PENDING', "sentAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);`,
            `CREATE TABLE IF NOT EXISTS "AuditLog" ("id" TEXT PRIMARY KEY, "userId" TEXT, "action" TEXT NOT NULL, "details" TEXT, "ipAddress" TEXT, "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);`,
          ];
          for (const query of tableQueries) {
            await this.$executeRawUnsafe(query);
          }
          this.logger.log('Database tables verified and created successfully.');
        } catch (tableErr) {
          this.logger.warn(`Table verification warning: ${tableErr.message}`);
        }

        break;
      } catch (error) {
        attempts++;
        this.logger.warn(`Database connection attempt ${attempts} failed: ${error.message}`);
        if (attempts >= maxAttempts) {
          this.logger.error('Could not establish initial database connection. Server starting in offline mode.');
        } else {
          await new Promise((res) => setTimeout(res, 2000));
        }
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
