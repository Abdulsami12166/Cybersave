import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  ApplicationsService,
  CreateApplicationDto,
} from './applications.service';

@Controller(['api/v1/applications', 'applications'])
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  async createApplication(@Body() dto: CreateApplicationDto) {
    return this.applicationsService.createApplication(dto);
  }

  @Get()
  async getUserApplications(
    @Query('userId') userId: string,
    @Query('status') status?: string,
  ) {
    // If no userId query, fallback to system default for testing
    const targetUserId = userId || 'default-user-id';
    return this.applicationsService.getUserApplications(targetUserId, status);
  }

  @Get(':id')
  async getApplicationById(@Param('id') id: string) {
    return this.applicationsService.getApplicationById(id);
  }

  @Patch(':id/status')
  async updateStatusPatch(
    @Param('id') id: string,
    @Body() body: { status: string; rejectionReason?: string },
  ) {
    return this.applicationsService.updateStatus(id, body.status, body.rejectionReason);
  }

  @Put(':id/status')
  async updateStatusPut(
    @Param('id') id: string,
    @Body() body: { status: string; rejectionReason?: string },
  ) {
    return this.applicationsService.updateStatus(id, body.status, body.rejectionReason);
  }

  @Post(':id/status')
  async updateStatusPost(
    @Param('id') id: string,
    @Body() body: { status: string; rejectionReason?: string },
  ) {
    return this.applicationsService.updateStatus(id, body.status, body.rejectionReason);
  }

  @Post(':id/approve')
  async approveApplication(@Param('id') id: string) {
    return this.applicationsService.updateStatus(id, 'APPROVED');
  }

  @Post(':id/reject')
  async rejectApplication(
    @Param('id') id: string,
    @Body() body?: { rejectionReason?: string },
  ) {
    return this.applicationsService.updateStatus(id, 'REJECTED', body?.rejectionReason);
  }
}
