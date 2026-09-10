import { NestFactory } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../auth/auth.module';
import { UsersModule } from '../../users/users.module';
import { ProfileModule } from '../../profile/profile.module';
import { GlobalExceptionFilter } from '../../common/filters/http-exception.filter';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';
import { winstonLoggerInstance } from '../../common/config/winston.config';
import { json, urlencoded } from 'express';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProfileModule,
  ],
})
export class AuthServiceAppModule {}

export async function bootstrapAuthService() {
  const app = await NestFactory.create(AuthServiceAppModule, {
    logger: winstonLoggerInstance,
  });

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`[Auth & User Microservice] Running on http://0.0.0.0:${port}`);
  return app;
}

if (require.main === module) {
  bootstrapAuthService();
}
