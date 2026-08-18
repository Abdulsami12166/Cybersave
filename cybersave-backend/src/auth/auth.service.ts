import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../common/services/redis.service';
import { SmsService } from '../common/services/sms.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly smsService: SmsService,
  ) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async register(email: string, passwordHash: string, fullName: string, phone?: string) {
    const cleanEmail = email.trim();
    const cleanPhone = phone?.trim().replace(/\s+/g, '');

    let user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    if (user) {
      throw new BadRequestException('User with this email already exists');
    }

    if (cleanPhone) {
      const existingPhone = await this.prisma.user.findFirst({ where: { phone: cleanPhone } });
      if (existingPhone) {
        throw new BadRequestException('User with this phone number already exists');
      }
    }

    const salt = await bcrypt.genSalt();
    const hashed = await bcrypt.hash(passwordHash, salt);

    user = await this.prisma.user.create({
      data: {
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash: hashed,
        profile: {
          create: {
            fullName: fullName.trim(),
            email: cleanEmail,
            phone: cleanPhone,
          },
        },
        wallet: {
          create: {
            balance: 100.0,
          },
        },
      },
      include: { profile: true },
    });

    this.logger.log(`Created new user via standard auth: ${user.id}`);
    return { success: true, message: 'User registered successfully' };
  }

  async sendOtp(phone: string) {
    if (!phone) throw new BadRequestException('Phone number is required');
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    
    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis (valid for 5 minutes)
    await this.redisService.set(`otp:${cleanPhone}`, otp, 300);
    this.logger.log(`[AuthService] Generated OTP ${otp} for phone ${cleanPhone}`);

    // Send SMS
    await this.smsService.sendSms(cleanPhone, otp);

    const devOtpEnabled = process.env.DEV_OTP_ENABLED !== 'false';
    return {
      success: true,
      message: 'OTP sent successfully.',
      devOtp: devOtpEnabled ? otp : undefined,
    };
  }

  async login(email: string, passwordHash: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(passwordHash, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const otpCode = this.generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode, otpExpiry }
    });

    // Simulate sending email
    this.logger.log(`[SIMULATED EMAIL] OTP for ${email} is ${otpCode}`);

    const devOtpEnabled = process.env.DEV_OTP_ENABLED !== 'false';
    return { 
      success: true, 
      message: 'OTP sent to email', 
      email,
      devOtp: devOtpEnabled ? otpCode : undefined
    };
  }

  async verifyOtp(identifier: string, otp: string) {
    if (!identifier || !otp) throw new BadRequestException('Identifier and OTP are required');
    const cleanId = identifier.trim().replace(/\s+/g, '');
    const isPhone = /^\+?[0-9]{10,15}$/.test(cleanId);

    if (isPhone) {
      const storedOtp = await this.redisService.get(`otp:${cleanId}`);
      if (!storedOtp || storedOtp !== otp) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }
      await this.redisService.del(`otp:${cleanId}`);

      let user = await this.prisma.user.findFirst({
        where: { phone: cleanId },
        include: { profile: true },
      });

      if (!user) {
        const userEmail = `user_${cleanId.slice(-4)}_${Date.now()}@cybersave.gov.in`;
        user = await this.prisma.user.create({
          data: {
            phone: cleanId,
            email: userEmail,
            profile: {
              create: {
                fullName: 'Citizen User',
                phone: cleanId,
                email: userEmail,
              },
            },
            wallet: {
              create: {
                balance: 100.0,
              },
            },
          },
          include: { profile: true },
        });
        this.logger.log(`Created new user via mobile OTP: ${user.id}`);
      }

      const payload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          role: user.role,
          fullName: user.profile?.fullName || 'Citizen User',
        },
      };
    } else {
      const user = await this.prisma.user.findUnique({ where: { email: cleanId }, include: { profile: true } });
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.otpCode || user.otpCode !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      // Clear OTP
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otpCode: null, otpExpiry: null }
      });

      const payload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.profile?.fullName || 'Citizen User',
        }
      };
    }
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const otpCode = this.generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode, otpExpiry }
    });

    // Simulate sending email
    this.logger.log(`[SIMULATED EMAIL] RESENT OTP for ${email} is ${otpCode}`);

    return { success: true, message: 'OTP resent to email' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });
    if (!user) throw new BadRequestException('User not found');
    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        fullName: user.profile?.fullName,
      }
    };
  }
}
