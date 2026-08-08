import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator';

@ApiTags('Documents')
@Controller(['api/v1/documents', 'documents'])
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user documents' })
  async getMyDocuments(@GetUser('sub') userId: string) {
    return this.documentsService.getUserDocuments(userId);
  }

  @Get('storage-usage')
  @ApiOperation({ summary: 'Get storage usage for current user' })
  async getStorageUsage(@GetUser('sub') userId: string) {
    return this.documentsService.getStorageUsage(userId);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Save uploaded document metadata' })
  async uploadDocument(
    @GetUser('sub') userId: string,
    @Body() body: { fileName: string; fileUrl: string; fileType?: string; fileSize?: number; applicationId?: string },
  ) {
    return this.documentsService.createDocument(userId, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document by ID' })
  async deleteDocument(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.documentsService.deleteDocument(userId, id);
  }
}
