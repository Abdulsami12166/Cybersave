import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { winstonLoggerInstance } from './common/config/winston.config';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonLoggerInstance,
  });

  // Enable full dynamic CORS with credentials support across all web & mobile clients
  app.enableCors({
    origin: (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow all origins and reflect origin for browser credential compatibility
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
  });

  // Security Headers using Helmet
  app.use(helmet());

  // Compression for bandwidth optimization
  app.use(compression());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global HTTP Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Logging Interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('CyberSave API')
    .setDescription(
      'The CyberSave enterprise production backend API documentation.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  winstonLoggerInstance.log(
    `Application is running on: http://localhost:${port}`,
  );
  winstonLoggerInstance.log(
    `Swagger docs available at: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
