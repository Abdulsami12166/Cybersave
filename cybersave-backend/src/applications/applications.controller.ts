import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
}
