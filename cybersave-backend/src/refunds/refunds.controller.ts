import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateRefundDto, RefundsService } from './refunds.service';

@Controller(['api/v1/refunds', 'refunds'])
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  async createRefundRequest(@Body() dto: CreateRefundDto) {
    return this.refundsService.createRefundRequest(dto);
  }

  @Get()
  async getAllRefunds(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('applicationId') applicationId?: string,
  ) {
    return this.refundsService.getAllRefunds({ userId, status, applicationId });
  }

  @Get(':id')
  async getRefundById(@Param('id') id: string) {
    return this.refundsService.getRefundById(id);
  }

  @Post(':id/approve')
  async approveRefund(
    @Param('id') id: string,
    @Body() body?: { adminName?: string; adminEmail?: string },
  ) {
    const adminName = body?.adminName || body?.adminEmail || 'Admin Authority';
    return this.refundsService.approveRefund(id, adminName);
  }

  @Post(':id/reject')
  async rejectRefund(
    @Param('id') id: string,
    @Body() body?: { rejectionReason?: string; adminName?: string },
  ) {
    const adminName = body?.adminName || 'Admin Authority';
    return this.refundsService.rejectRefund(id, body?.rejectionReason, adminName);
  }
}
