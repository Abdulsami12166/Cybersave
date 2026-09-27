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
  @ApiOperation({ summary: 'Create or update a government service workflow' })
  async createService(@Body() body: any) {
    return this.servicesService.createOrUpdateService(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update existing service scheme and configure sub-services' })
  async updateService(@Param('id') id: string, @Body() body: any) {
    return this.servicesService.createOrUpdateService({ ...body, id });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Patch existing service scheme and configure sub-services' })
  async patchService(@Param('id') id: string, @Body() body: any) {
    return this.servicesService.createOrUpdateService({ ...body, id });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get service details by slug' })
  async getServiceBySlug(@Param('slug') slug: string) {
    return this.servicesService.getServiceBySlug(slug);
  }
}

