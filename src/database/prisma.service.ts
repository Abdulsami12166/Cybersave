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
          await this.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "User" ("id" TEXT PRIMARY KEY, "phone" TEXT UNIQUE NOT NULL, "email" TEXT, "role" TEXT DEFAULT 'USER', "fcmToken" TEXT, "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS "Profile" ("id" TEXT PRIMARY KEY, "userId" TEXT UNIQUE NOT NULL, "fullName" TEXT, "dob" TEXT, "gender" TEXT, "address" TEXT, "state" TEXT, "pincode" TEXT, "avatarUrl" TEXT);
            CREATE TABLE IF NOT EXISTS "Service" ("id" TEXT PRIMARY KEY, "slug" TEXT UNIQUE NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "category" TEXT NOT NULL, "department" TEXT NOT NULL, "fee" DOUBLE PRECISION NOT NULL DEFAULT 0, "processingTime" TEXT NOT NULL, "eligibility" TEXT[], "requiredDocs" TEXT[], "isActive" BOOLEAN NOT NULL DEFAULT true, "iconName" TEXT, "colorHex" TEXT);
            CREATE TABLE IF NOT EXISTS "Application" ("id" TEXT PRIMARY KEY, "referenceNo" TEXT UNIQUE NOT NULL, "userId" TEXT NOT NULL, "serviceId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'SUBMITTED', "applicantData" JSONB NOT NULL, "documents" TEXT[], "remarks" TEXT, "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS "Wallet" ("id" TEXT PRIMARY KEY, "userId" TEXT UNIQUE NOT NULL, "balance" DOUBLE PRECISION NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'INR');
            CREATE TABLE IF NOT EXISTS "WalletTransaction" ("id" TEXT PRIMARY KEY, "walletId" TEXT NOT NULL, "type" TEXT NOT NULL, "amount" DOUBLE PRECISION NOT NULL, "description" TEXT NOT NULL, "referenceId" TEXT, "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS "DocumentUpload" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "docType" TEXT NOT NULL, "fileUrl" TEXT NOT NULL, "publicId" TEXT, "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS "Notification" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "isRead" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);
          `);
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
