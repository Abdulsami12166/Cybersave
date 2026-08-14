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
import { GetUser } from '../common/decorators/user.decorator';
import { AadhaarService } from './aadhaar.service';

@Controller('api/v1/aadhaar')
@UseGuards(JwtAuthGuard)
export class AadhaarController {
  constructor(private readonly aadhaarService: AadhaarService) {}

  @Post('okyc/send-otp')
  async sendOtp(
    @Body('aadhaarNumber') aadhaarNumber: string,
    @Body('consent') consent: string,
    @GetUser('sub') userId: string,
  ) {
    return this.aadhaarService.sendOkycOtp(userId, aadhaarNumber, consent);
  }

  @Post('okyc/verify-otp')
  async verifyOtp(
    @Body('referenceId') referenceId: string,
    @Body('otp') otp: string,
    @GetUser('sub') userId: string,
  ) {
    return this.aadhaarService.verifyOkycOtp(userId, referenceId, otp);
  }

  @Get()
  async getDocuments(@GetUser('sub') userId: string) {
    return this.aadhaarService.getUserDocuments(userId);
  }

  @Delete(':id')
  async deleteDocument(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.aadhaarService.deleteDocument(userId, id);
  }
}
