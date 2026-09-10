import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RedisService } from '../common/services/redis.service';
import { SmsService } from '../common/services/sms.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'super-secret-cybersave-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [
    AuthService,
    RedisService,
    SmsService,
    JwtAuthGuard,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    RedisService,
    SmsService,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
