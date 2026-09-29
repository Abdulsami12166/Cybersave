import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { DatabaseModule } from '../database/database.module';
import { BlockedUserGuard } from '../common/guards/blocked-user.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [PaymentController],
  providers: [PaymentService, BlockedUserGuard],
  exports: [PaymentService],
})
export class PaymentModule {}
