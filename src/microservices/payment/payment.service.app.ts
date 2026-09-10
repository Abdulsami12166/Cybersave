import { NestFactory } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { WalletModule } from '../../wallet/wallet.module';
import { PaymentModule } from '../../payment/payment.module';
import { GlobalExceptionFilter } from '../../common/filters/http-exception.filter';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';
import { winstonLoggerInstance } from '../../common/config/winston.config';
import { json, urlencoded } from 'express';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    WalletModule,
    PaymentModule,
  ],
})
export class PaymentServiceAppModule {}

export async function bootstrapPaymentService() {
  const app = await NestFactory.create(PaymentServiceAppModule, {
    logger: winstonLoggerInstance,
  });

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = parseInt(process.env.PAYMENT_SERVICE_PORT || '3003', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`[Payment & Wallet Microservice] Running on http://0.0.0.0:${port}`);
  return app;
}

if (require.main === module) {
  bootstrapPaymentService();
}
