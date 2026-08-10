import { Controller, Post, UseInterceptors, UploadedFile, Body, Req, UseGuards, Delete, Param, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AadhaarService } from './aadhaar.service';

@Controller('v1/aadhaar')
@UseGuards(JwtAuthGuard)
export class AadhaarController {
  constructor(private readonly aadhaarService: AadhaarService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importAadhaar(
    @UploadedFile() file: Express.Multer.File,
    @Body('shareCode') shareCode: string,
    @Req() req: any
  ) {
    return this.aadhaarService.processAadhaarZip(req.user.id, file, shareCode);
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
