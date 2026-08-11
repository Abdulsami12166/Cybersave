import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Delete,
  Param,
  Get,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { AadhaarService } from './aadhaar.service';

@Controller('v1/aadhaar')
@UseGuards(JwtAuthGuard)
export class AadhaarController {
  constructor(private readonly aadhaarService: AadhaarService) {}

  @Post('okyc/send-otp')
  async sendOtp(
    @Body('aadhaarNumber') aadhaarNumber: string,
    @Body('consent') consent: string,
    @Req() req: any,
  ) {
    return this.aadhaarService.sendOkycOtp(req.user.id, aadhaarNumber, consent);
  }

  @Post('okyc/verify-otp')
  async verifyOtp(
    @Body('referenceId') referenceId: string,
    @Body('otp') otp: string,
    @Req() req: any,
  ) {
    return this.aadhaarService.verifyOkycOtp(req.user.id, referenceId, otp);
  }

  @Get()
  async getDocuments(@Req() req: any) {
    return this.aadhaarService.getUserDocuments(req.user.id);
  }

  @Delete(':id')
  async deleteDocument(@Req() req: any, @Param('id') id: string) {
    return this.aadhaarService.deleteDocument(req.user.id, id);
  }
}
