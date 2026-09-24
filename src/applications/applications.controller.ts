import { Body, Controller, Get, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
import {
  ApplicationsService,
  CreateApplicationDto,
} from './applications.service';

@Controller(['api/v1/applications', 'applications', 'api/admin/applications', 'admin/applications'])
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
    @Query('refNumbers') refNumbers?: string,
  ) {
    return this.applicationsService.getUserApplications(userId, status, refNumbers);
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
    const text = body.text || body.noteText || body.note || '';
    return this.applicationsService.addInternalNote(id, text, body);
  }

  @Patch(':id/notes')
  async addInternalNotePatch(
    @Param('id') id: string,
    @Body() body: { text: string; noteText?: string; note?: string; adminId?: string; adminEmail?: string; adminName?: string; adminRole?: string },
  ) {
    const text = body.text || body.noteText || body.note || '';
    return this.applicationsService.addInternalNote(id, text, body);
  }
}
