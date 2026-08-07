import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ResendService } from '../services/resend.service';
import { TwilioService } from '../services/twilio.service';

@Injectable()
export class AppWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('AppWorker');
  private worker: Worker | null = null;

  constructor(
    private readonly resendService: ResendService,
    private readonly twilioService: TwilioService,
  ) {}

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        const url = new URL(redisUrl);
        this.worker = new Worker(
          'CyberSaveQueue',
          async (job: Job) => {
            this.logger.log(`[Worker] Processing job ${job.id} of type ${job.name}`);
            await this.processJob(job.name, job.data);
          },
          {
            connection: {
              host: url.hostname,
              port: parseInt(url.port || '6379', 10),
              username: url.username || undefined,
              password: url.password || undefined,
            },
          },
        );

        this.worker.on('completed', (job) => {
          this.logger.log(`[Worker] Job ${job.id} completed successfully.`);
        });

        this.worker.on('failed', (job, err) => {
          this.logger.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
        });
      } catch (err) {
        this.logger.warn(`Could not start BullMQ background worker: ${err.message}`);
      }
    }
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async processJob(name: string, data: any) {
    switch (name) {
      case 'SEND_EMAIL':
        await this.resendService.sendEmail(data.to, data.subject, data.html);
        break;
      case 'SEND_SMS':
        await this.twilioService.sendSms(data.to, data.body);
        break;
      default:
        this.logger.warn(`Unknown job type: ${name}`);
    }
  }
}
