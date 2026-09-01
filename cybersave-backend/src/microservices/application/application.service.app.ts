import { NestFactory } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { ApplicationsModule } from '../../applications/applications.module';
import { ServicesModule } from '../../services/services.module';
import { SandboxModule } from '../../sandbox/sandbox.module';
import { GlobalExceptionFilter } from '../../common/filters/http-exception.filter';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';
import { winstonLoggerInstance } from '../../common/config/winston.config';
import { json, urlencoded } from 'express';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ApplicationsModule,
    ServicesModule,
    SandboxModule,
  ],
})
export class ApplicationServiceAppModule {}

export async function bootstrapApplicationService() {
  const app = await NestFactory.create(ApplicationServiceAppModule, {
    logger: winstonLoggerInstance,
  });

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = parseInt(process.env.APPLICATION_SERVICE_PORT || '3002', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`[Application & Scheme Microservice] Running on http://0.0.0.0:${port}`);
  return app;
}

if (require.main === module) {
  bootstrapApplicationService();
}
