import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { ServicesModule } from './services/services.module';
import { ApplicationsModule } from './applications/applications.module';
import { WalletModule } from './wallet/wallet.module';
import { AiModule } from './ai/ai.module';
import { DocumentsModule } from './documents/documents.module';
import { IntegrationsModule } from './common/services/integrations.module';
import { AadhaarModule } from './aadhaar/aadhaar.module';
import { SandboxModule } from './sandbox/sandbox.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    ServicesModule,
    ApplicationsModule,
    WalletModule,
    AiModule,
    DocumentsModule,
    IntegrationsModule,
    AadhaarModule,
    SandboxModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
