import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { FirebaseService } from '../common/services/firebase.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
    private readonly jwtService: JwtService,
  ) {}

  async verifyFirebaseToken(token: string) {
    try {
      const decoded = await this.firebaseService.verifyIdToken(token);
      const uid = decoded.uid;
      const email = decoded.email || `${uid}@cybersave.gov.in`;
      const phone = (decoded as any).phone_number || null;

      let user = await this.prisma.user.findUnique({
        where: { firebaseUid: uid },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            firebaseUid: uid,
            email,
            phone,
            profile: {
              create: {
                fullName: email ? email.split('@')[0] : 'Rajesh Kumar',
                phone: phone || '+919876543210',
                email,
              },
            },
            wallet: {
              create: {
                balance: 0.0,
              },
            },
            auditLogs: {
              create: {
                action: 'USER_REGISTER',
                details: 'User registered via Firebase Auth / OTP',
              },
            },
          },
        });
        this.logger.log(`Created new Cybersave user account: ${user.id}`);
      } else {
        await this.prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'USER_LOGIN',
            details: 'User logged in via Firebase token verification',
          },
        });
      }

      const userEmail = user.email || 'user@cybersave.gov.in';
      const tokens = await this.generateTokens(user.id, userEmail, user.role);

      return {
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          role: user.role,
        },
        ...tokens,
      };
    } catch (error) {
      this.logger.error('Firebase sign-in token verification failed', error);
      throw new UnauthorizedException('Invalid credentials.');
    }
  }

  async refreshToken(tokenStr: string) {
    try {
      const payload = this.jwtService.verify(tokenStr, {
        secret: process.env.JWT_REFRESH_SECRET || 'cybersave-prod-jwt-refresh-secret-key-321-secure',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.deletedAt) {
        throw new UnauthorizedException('User no longer exists.');
      }

      const userEmail = user.email || 'user@cybersave.gov.in';
      return this.generateTokens(user.id, userEmail, user.role);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { email, role, sub: userId };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'cybersave-prod-jwt-secret-key-321-secure',
      expiresIn: (process.env.JWT_ACCESS_EXPIRATION || '15m') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'cybersave-prod-jwt-refresh-secret-key-321-secure',
      expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as any,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
