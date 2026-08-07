import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getWallet(@Query('userId') userId: string) {
    const targetUserId = userId || 'default-user-id';
    return this.walletService.getOrCreateWallet(targetUserId);
  }

  @Post('add-money')
  async addMoney(
    @Body('userId') userId: string,
    @Body('amount') amount: number,
    @Body('method') method?: string,
  ) {
    const targetUserId = userId || 'default-user-id';
    return this.walletService.addMoney(targetUserId, amount || 100, method || 'UPI');
  }
}
