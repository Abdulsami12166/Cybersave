import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async register(email: string, passwordHash: string, fullName: string) {
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      throw new BadRequestException('User with this email already exists');
    }

    const salt = await bcrypt.genSalt();
    const hashed = await bcrypt.hash(passwordHash, salt);

    user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashed,
        profile: {
          create: {
            fullName,
            email,
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

    return { success: true, message: 'OTP sent to email', email };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { profile: true } });
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
        fullName: user.profile?.fullName,
      }
    };
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
