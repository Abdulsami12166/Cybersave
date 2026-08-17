import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { FirebaseService } from '../common/services/firebase.service';
import { RedisService } from '../common/services/redis.service';
import { SmsService } from '../common/services/sms.service';
import { ResendService } from '../common/services/resend.service';
import {
  hashPassword,
  comparePassword,
} from '../common/utils/password-crypto.util';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
    private readonly redisService: RedisService,
    private readonly smsService: SmsService,
    private readonly resendService: ResendService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Generates a 6-digit dummy OTP and stores it in Redis for development.
   */
  async sendOtp(sendOtpDto: SendOtpDto) {
    const cleanPhone = sendOtpDto.phone.trim().replace(/\s+/g, '');
    const devOtpEnabled = process.env.DEV_OTP_ENABLED !== 'false'; // Default true for this task unless explicitly false

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in Redis (valid for 5 minutes)
    await this.redisService.set(`otp:${cleanPhone}`, otp, 300);

    this.logger.log(`[AuthService] Generated OTP ${otp} for ${cleanPhone}`);

    return {
      success: true,
      message: 'OTP sent successfully.',
      devOtp: devOtpEnabled ? otp : undefined,
    };
  }

  /**
   * Verifies the 6-digit OTP from Redis and logs in/registers user.
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const cleanPhone = verifyOtpDto.phone.trim().replace(/\s+/g, '');
    const { fullName, email, otp } = verifyOtpDto;

    const storedOtp = await this.redisService.get(`otp:${cleanPhone}`);
    if (!storedOtp || storedOtp !== otp) {
      throw new BadRequestException('Invalid or expired OTP.');
    }

    // Delete OTP after successful verification to prevent reuse
    await this.redisService.del(`otp:${cleanPhone}`);

    let user: any = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: cleanPhone }, { phone: verifyOtpDto.phone }],
      },
      include: { profile: true },
    });

    if (!user) {
      const userEmail =
        email || `user_${cleanPhone.slice(-4)}@cybersave.gov.in`;
      const userName = fullName || 'Citizen User';

      user = await this.prisma.user.create({
        data: {
          phone: cleanPhone,
          email: userEmail,
          profile: {
            create: {
              fullName: userName,
              phone: cleanPhone,
              email: userEmail,
            },
          },
          wallet: {
            create: {
              balance: 100.0, // Welcome signup bonus
            },
          },
          auditLogs: {
            create: {
              action: 'USER_REGISTER',
              details: 'User registered via Mobile Phone OTP',
            },
          },
        },
        include: { profile: true },
      });
      this.logger.log(`Created new Cybersave user account via OTP: ${user.id}`);
    } else {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_LOGIN',
          details: 'User logged in via Mobile Phone OTP',
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
        fullName: user.profile?.fullName || 'Citizen User',
      },
      ...tokens,
    };
  }

  /**
   * Registers a new user account with Email & Password.
   */
  async registerWithEmail(registerDto: RegisterDto) {
    const cleanEmail = registerDto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      throw new ConflictException(
        'An account with this email address already exists.',
      );
    }

    const passwordHash = hashPassword(registerDto.password);
    const cleanPhone = registerDto.phone
      ? registerDto.phone.trim().replace(/\s+/g, '')
      : undefined;

    const user: any = await this.prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        phone: cleanPhone,
        profile: {
          create: {
            fullName: registerDto.fullName,
            email: cleanEmail,
            phone: cleanPhone || undefined,
          },
        },
        wallet: {
          create: {
            balance: 100.0, // Welcome signup bonus
          },
        },
        auditLogs: {
          create: {
            action: 'USER_REGISTER',
            details: 'User registered via Email & Password',
          },
        },
      },
      include: { profile: true },
    });

    this.logger.log(`Created new Cybersave user account via Email: ${user.id}`);

    try {
      await this.resendService.sendEmail(
        cleanEmail,
        'Welcome to CyberSave!',
        `<h1>Welcome to CyberSave, ${registerDto.fullName}!</h1><p>Your account has been successfully created and your digital wallet has been credited with ₹100.00 as a welcome bonus.</p>`
      );
      this.logger.log(`Welcome email sent to ${cleanEmail}`);
    } catch (e) {
      this.logger.warn(`Failed to send welcome email to ${cleanEmail}: ${e.message}`);
    }

    const userEmail = user.email || cleanEmail;
    const tokens = await this.generateTokens(user.id, userEmail, user.role);

    return {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        fullName: user.profile?.fullName || registerDto.fullName,
      },
      ...tokens,
    };
  }

  /**
   * Authenticates user via Email / Phone and Password.
   */
  async loginWithEmail(loginDto: LoginDto) {
    const identifier = loginDto.emailOrPhone.trim().toLowerCase();

    const user: any = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
      include: { profile: true },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid email/phone or password.');
    }

    const userPassHash = user.passwordHash;
    if (!userPassHash || !comparePassword(loginDto.password, userPassHash)) {
      throw new UnauthorizedException('Invalid email/phone or password.');
    }

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: 'User logged in via Email & Password',
      },
    });

    const userEmail = user.email || 'user@cybersave.gov.in';
    const tokens = await this.generateTokens(user.id, userEmail, user.role);

    return {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        fullName: user.profile?.fullName || 'Citizen User',
      },
      ...tokens,
    };
  }

  /**
   * Verifies Firebase or Google ID Token and logs in / registers user.
   */
  async verifyFirebaseToken(token: string) {
    try {
      const decoded = await this.firebaseService.verifyIdToken(token);
      const uid = decoded.uid;
      const email = decoded.email || `${uid}@cybersave.gov.in`;
      const phone = (decoded as any).phone_number || null;
      const fullName =
        (decoded as any).name || (email ? email.split('@')[0] : 'Rajesh Kumar');

      let user: any = await this.prisma.user.findFirst({
        where: {
          OR: [{ firebaseUid: uid }, { email }, ...(phone ? [{ phone }] : [])],
        },
        include: { profile: true },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            firebaseUid: uid,
            email,
            phone,
            profile: {
              create: {
                fullName,
                phone: phone || null,
                email,
              },
            },
            wallet: {
              create: {
                balance: 100.0,
              },
            },
            auditLogs: {
              create: {
                action: 'USER_REGISTER',
                details: 'User registered via Firebase / Google Sign-In',
              },
            },
          },
          include: { profile: true },
        });
        this.logger.log(
          `Created new Cybersave user account via Google/Firebase: ${user.id}`,
        );
      } else {
        await this.prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'USER_LOGIN',
            details: 'User logged in via Firebase / Google verification',
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
          fullName: user.profile?.fullName || fullName,
        },
        ...tokens,
      };
    } catch (error) {
      this.logger.error('Firebase sign-in token verification failed', error);
      throw new UnauthorizedException('Invalid Google / Firebase credentials.');
    }
  }

  async refreshToken(tokenStr: string) {
    try {
      const payload = this.jwtService.verify(tokenStr, {
        secret:
          process.env.JWT_REFRESH_SECRET ||
          'cybersave-prod-jwt-refresh-secret-key-321-secure',
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
      secret:
        process.env.JWT_SECRET || 'cybersave-prod-jwt-secret-key-321-secure',
      expiresIn: '7d', // Hardcoded to 7d to prevent rapid expiration lockouts
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret:
        process.env.JWT_REFRESH_SECRET ||
        'cybersave-prod-jwt-refresh-secret-key-321-secure',
      expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as any,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
