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

        // ponytail: list all User indexes to find and drop the stale phone unique index
        try {
          const result: any = await this.$runCommandRaw({ listIndexes: 'User' });
          const indexes: any[] = result?.cursor?.firstBatch || [];
          this.logger.log(`User indexes: ${JSON.stringify(indexes.map((i: any) => ({ name: i.name, key: i.key, unique: i.unique })))}`);

          for (const idx of indexes) {
            if (idx.key?.phone !== undefined && idx.unique === true) {
              await this.$runCommandRaw({ dropIndexes: 'User', index: idx.name });
              this.logger.log(`Dropped unique phone index: ${idx.name}`);
            }
          }
        } catch (e) {
          this.logger.warn(`Index cleanup warning: ${e.message}`);
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

