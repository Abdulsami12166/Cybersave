import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { DatabaseModule } from '../database/database.module';
import { BlockedUserGuard } from '../common/guards/blocked-user.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [WalletController],
  providers: [WalletService, BlockedUserGuard],
  exports: [WalletService],
})
export class WalletModule {}
