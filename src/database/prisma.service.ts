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
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        await this.$connect();
        this.logger.log('Prisma connected to MongoDB database successfully.');

        // ponytail: drop the stale User_phone_key unique index left over from old schema.
        // prisma db push does not drop existing indexes — we must do it manually once.
        try {
          await this.$runCommandRaw({
            dropIndexes: 'User',
            index: 'User_phone_key',
          });
          this.logger.log('Dropped stale User_phone_key unique index.');
        } catch (e) {
          // Index already gone — fine, ignore
        }

        break;
      } catch (error) {
        attempts++;
        this.logger.warn(
          `Database connection attempt ${attempts} failed: ${error.message}`,
        );
        if (attempts >= maxAttempts) {
          this.logger.error(
            'Could not establish initial database connection. Server starting in offline mode.',
          );
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

