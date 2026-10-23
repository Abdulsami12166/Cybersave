import { Body, Controller, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApplicationsService,
  CreateApplicationDto,
} from './applications.service';
import { BlockedUserGuard } from '../common/guards/blocked-user.guard';

@Controller(['api/v1/applications', 'applications'])
@UseGuards(BlockedUserGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  async createApplication(@Body() dto: CreateApplicationDto) {
    return this.applicationsService.createApplication(dto);
  }

  @Get()
  async getUserApplications(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.applicationsService.getUserApplications(userId, status);
  }

  @Post(['bulk-approve', 'bulk_approve'])
  async bulkApprovePost(
    @Body() body: { applicationIds: string[]; adminId?: string; adminEmail?: string; adminName?: string; adminRole?: string },
  ) {
    const ids = Array.isArray(body?.applicationIds) ? body.applicationIds : [];
    return this.applicationsService.bulkApprove(ids, body);
  }

  @Put(['bulk-approve', 'bulk_approve'])
  async bulkApprovePut(
    @Body() body: { applicationIds: string[]; adminId?: string; adminEmail?: string; adminName?: string; adminRole?: string },
  ) {
    const ids = Array.isArray(body?.applicationIds) ? body.applicationIds : [];
    return this.applicationsService.bulkApprove(ids, body);
  }

  @Get(':id/certificate')
  async getCertificateDetails(@Param('id') id: string) {
    return this.applicationsService.getCertificateDetails(id);
  }

  @Get(':id/certificate.pdf')
  async generateCertificatePdf(@Param('id') id: string, @Res() res: any) {
    return this.applicationsService.generateCertificatePdf(id, res);
  }

  @Get(':id')
  async getApplicationById(@Param('id') id: string) {
    return this.applicationsService.getApplicationById(id);
  }

  @Patch(':id/status')
  async updateStatusPatch(
    @Param('id') id: string,
    @Body() body: { status: string; rejectionReason?: string; adminId?: string; adminEmail?: string; adminName?: string; adminRole?: string },
  ) {
    return this.applicationsService.updateStatus(id, body.status, body.rejectionReason, body);
  }

  @Put(':id/status')
  async updateStatusPut(
    @Param('id') id: string,
    @Body() body: { status: string; rejectionReason?: string; adminId?: string; adminEmail?: string; adminName?: string; adminRole?: string },
  ) {
    return this.applicationsService.updateStatus(id, body.status, body.rejectionReason, body);
  }

  @Post(':id/status')
  async updateStatusPost(
    @Param('id') id: string,
    @Body() body: { status: string; rejectionReason?: string; adminId?: string; adminEmail?: string; adminName?: string; adminRole?: string },
  ) {
    return this.applicationsService.updateStatus(id, body.status, body.rejectionReason, body);
  }

  @Post(':id/approve')
  async approveApplication(
    @Param('id') id: string,
    @Body() body?: { rejectionReason?: string; adminId?: string; adminEmail?: string; adminName?: string; adminRole?: string },
  ) {
    return this.applicationsService.updateStatus(id, 'APPROVED', undefined, body);
  }

  @Post(':id/reject')
  async rejectApplication(
    @Param('id') id: string,
    @Body() body?: { rejectionReason?: string; adminId?: string; adminEmail?: string; adminName?: string; adminRole?: string },
  ) {
    return this.applicationsService.updateStatus(id, 'REJECTED', body?.rejectionReason, body);
  }

  @Post(':id/assign')
  async assignApplicationPost(
    @Param('id') id: string,
    @Body() body: { operatorName: string; operatorId?: string },
  ) {
    return this.applicationsService.assignOperator(id, body.operatorName, body.operatorId);
  }

  @Put(':id/assign')
  async assignApplicationPut(
    @Param('id') id: string,
    @Body() body: { operatorName: string; operatorId?: string },
  ) {
    return this.applicationsService.assignOperator(id, body.operatorName, body.operatorId);
  }

  @Patch(':id/checklist')
  async updateChecklistPatch(
    @Param('id') id: string,
    @Body() body: { checklist: any[]; adminId?: string; adminEmail?: string; adminName?: string; adminRole?: string },
  ) {
    return this.applicationsService.updateChecklist(id, body.checklist, body);
  }

  @Put(':id/checklist')
  async updateChecklistPut(
    @Param('id') id: string,
    @Body() body: { checklist: any[]; adminId?: string; adminEmail?: string; adminName?: string; adminRole?: string },
  ) {
    return this.applicationsService.updateChecklist(id, body.checklist, body);
  }

  @Post(':id/checklist')
  async updateChecklistPost(
    @Param('id') id: string,
    @Body() body: { checklist: any[]; adminId?: string; adminEmail?: string; adminName?: string; adminRole?: string },
  ) {
    return this.applicationsService.updateChecklist(id, body.checklist, body);
  }

  @Post(':id/notes')
  async addInternalNotePost(
    @Param('id') id: string,
    @Body() body: { text: string; noteText?: string; note?: string; adminId?: string; adminEmail?: string; adminName?: string; adminRole?: string },
  ) {
    const content = body.text || body.noteText || body.note || '';
    return this.applicationsService.addInternalNote(id, content, body);
  }
}
