import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { FirebaseService } from './firebase.service';
import { RedisService } from '../common/services/redis.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true, // Export JwtService globally so other modules can use the JwtAuthGuard easily
    }),
  ],
  providers: [AuthService, FirebaseService, RedisService, JwtAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, FirebaseService, RedisService, JwtAuthGuard],
})
export class AuthModule {}
