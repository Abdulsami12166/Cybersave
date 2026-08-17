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
    await this.$connect();
    this.logger.log('Prisma connected to MongoDB database successfully.');
    await this.dropPhoneUniqueIndex();
  }

  private async dropPhoneUniqueIndex() {
    // ponytail: stale User_phone_key unique index blocks multi-user registration.
    // We must drop it via raw MongoDB command since prisma db push won't do it.
    const candidates = ['User_phone_key', 'phone_1', 'phone'];
    for (const name of candidates) {
      try {
        await this.$runCommandRaw({ dropIndexes: 'User', index: name });
        this.logger.log(`Dropped stale index: ${name}`);
      } catch {
        // index didn't exist — fine
      }
    }
    this.logger.log('Phone index cleanup complete.');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
