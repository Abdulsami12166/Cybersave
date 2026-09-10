import { NestFactory } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { DocumentsModule } from '../../documents/documents.module';
import { AadhaarModule } from '../../aadhaar/aadhaar.module';
import { IntegrationsModule } from '../../common/services/integrations.module';
import { GlobalExceptionFilter } from '../../common/filters/http-exception.filter';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';
import { winstonLoggerInstance } from '../../common/config/winston.config';
import { json, urlencoded } from 'express';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    DocumentsModule,
    AadhaarModule,
    IntegrationsModule,
  ],
})
export class DocumentServiceAppModule {}

export async function bootstrapDocumentService() {
  const app = await NestFactory.create(DocumentServiceAppModule, {
    logger: winstonLoggerInstance,
  });

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = parseInt(process.env.DOCUMENT_SERVICE_PORT || '3004', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`[Document & KYC Microservice] Running on http://0.0.0.0:${port}`);
  return app;
}

if (require.main === module) {
  bootstrapDocumentService();
}
