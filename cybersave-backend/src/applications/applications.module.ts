import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { DatabaseModule } from '../database/database.module';
import { BlockedUserGuard } from '../common/guards/blocked-user.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, BlockedUserGuard],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
