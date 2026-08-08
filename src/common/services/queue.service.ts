import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ResendService } from './resend.service';
import { TwilioService } from './twilio.service';

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger('QueueService');
  private mainQueue: Queue | null = null;

  constructor(
    private readonly resendService: ResendService,
    private readonly twilioService: TwilioService,
  ) {}

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        // BullMQ requires direct connection options
        const url = new URL(redisUrl);
        this.mainQueue = new Queue('CyberSaveQueue', {
          connection: {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            username: url.username || undefined,
            password: url.password || undefined,
          },
          skipEvictionCheck: true,
        } as any);
        this.logger.log('BullMQ CyberSaveQueue initialized.');
      } catch (err) {
        this.logger.warn(`Failed to connect BullMQ queue to Redis: ${err.message}. Operating in in-memory immediate execution mode.`);
      }
    } else {
      this.logger.warn('REDIS_URL missing. Operating in in-memory immediate execution mode.');
    }
  }

  async addJob(name: string, data: any) {
    this.logger.log(`Adding job to queue: ${name}`);

    if (this.mainQueue) {
      try {
        await this.mainQueue.add(name, data, {
          attempts: 3,
          backoff: 5000,
        });
        return;
      } catch (err) {
        this.logger.warn(`Failed to add job to BullMQ: ${err.message}. Falling back to immediate execution.`);
      }
    }

    // Fallback: process job immediately in the background
    this.processJobInMemory(name, data).catch((err) => {
      this.logger.error(`In-memory background job execution failed for ${name}`, err);
    });
  }

  private async processJobInMemory(name: string, data: any) {
    this.logger.log(`[InMemoryWorker] Processing job: ${name}`);
    switch (name) {
      case 'SEND_EMAIL':
        await this.resendService.sendEmail(data.to, data.subject, data.html);
        break;
      case 'SEND_SMS':
        await this.twilioService.sendSms(data.to, data.body);
        break;
      default:
        this.logger.warn(`Unknown job name in-memory: ${name}`);
    }
  }
}
