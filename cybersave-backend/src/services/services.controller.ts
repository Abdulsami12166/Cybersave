import { Controller, Get, Post, Put, Patch, Body, Param, Query } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Services & Schemes')
@Controller(['api/v1/services', 'api/services', 'services'])
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all government services and schemes' })
  async getAllServices(@Query('category') category?: string) {
    return this.servicesService.getAllServices(category);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new government service workflow (edit must use PUT)' })
  async createService(@Body() body: any) {
    return this.servicesService.createOrUpdateService(body);
  }

  @Put([':idOrSlug', 'edit/:idOrSlug'])
  @Patch([':idOrSlug', 'edit/:idOrSlug'])
  @ApiOperation({ summary: 'Update an existing service by id — never creates a new record' })
  async updateService(@Param('idOrSlug') idOrSlug: string, @Body() body: any) {
    return this.servicesService.updateService(idOrSlug, body);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get service details by slug' })
  async getServiceBySlug(@Param('slug') slug: string) {
    return this.servicesService.getServiceBySlug(slug);
  }
}

