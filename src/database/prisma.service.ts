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
        this.logger.log(
          'Prisma connected to MongoDB database successfully.',
        );

    // ponytail: stale User_phone_key and User_keycloakId_key unique indexes block registration.
    // We drop them if they exist in MongoDB.
    const candidates = [
      'User_phone_key', 'phone_1', 'phone',
      'User_keycloakId_key', 'keycloakId_1', 'keycloakId'
    ];
    for (const name of candidates) {
      try {
        await this.$runCommandRaw({ dropIndexes: 'User', index: name });
        this.logger.log(`Dropped index ${name} from User collection`);
      } catch (e) {
        // ignore if index doesn't exist
      }
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
