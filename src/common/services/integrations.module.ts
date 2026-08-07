import { Global, Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { ResendService } from './resend.service';
import { TwilioService } from './twilio.service';
import { FirebaseService } from './firebase.service';
import { RedisService } from './redis.service';
import { QueueService } from './queue.service';
import { AppWorker } from '../workers/app.worker';

@Global()
@Module({
  providers: [
    CloudinaryService,
    ResendService,
    TwilioService,
    FirebaseService,
    RedisService,
    QueueService,
    AppWorker,
  ],
  exports: [
    CloudinaryService,
    ResendService,
    TwilioService,
    FirebaseService,
    RedisService,
    QueueService,
  ],
})
export class IntegrationsModule {}
