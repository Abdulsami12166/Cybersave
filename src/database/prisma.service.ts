import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('PrismaService');

  async onModuleInit() {
    try {
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma connect timeout')), 3500)),
      ]);
      this.logger.log('Prisma connected to MongoDB database successfully.');

      // Drop stale indexes asynchronously in background without blocking bootstrap
      Promise.resolve().then(async () => {
        const candidates = [
          'User_phone_key', 'phone_1', 'phone',
          'User_keycloakId_key', 'keycloakId_1', 'keycloakId'
        ];
        for (const name of candidates) {
          try {
            await this.$runCommandRaw({ dropIndexes: 'User', index: name });
          } catch (e) {}
        }
      });
    } catch (error: any) {
      this.logger.warn(`Initial database connection skipped/deferred: ${error?.message || error}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
