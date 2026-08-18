import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminGateway } from './admin.gateway';
import { DatabaseModule } from '../database/database.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'cybersave-prod-jwt-secret-key-321-secure-production-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminGateway],
  exports: [AdminGateway],
})
export class AdminModule {}
