import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return {
      status: 'ok',
      service: 'CyberSave API Server',
      timestamp: new Date().toISOString(),
      message: 'CyberSave API is online and running successfully',
    };
  }

  @Get(['health', 'api/health', 'api/v1/health'])
  getHealth() {
    return {
      status: 'healthy',
      service: 'CyberSave Production Backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
