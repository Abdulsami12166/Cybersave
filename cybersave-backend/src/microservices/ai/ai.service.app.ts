import { NestFactory } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { AiModule } from '../../ai/ai.module';
import { GlobalExceptionFilter } from '../../common/filters/http-exception.filter';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';
import { winstonLoggerInstance } from '../../common/config/winston.config';
import { json, urlencoded } from 'express';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AiModule,
  ],
})
export class AiServiceAppModule {}

export async function bootstrapAiService() {
  const app = await NestFactory.create(AiServiceAppModule, {
    logger: winstonLoggerInstance,
  });

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = parseInt(process.env.AI_SERVICE_PORT || '3005', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`[AI CyberBot Microservice] Running on http://0.0.0.0:${port}`);
  return app;
}

if (require.main === module) {
  bootstrapAiService();
}
