import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user with Email and Password' })
  async register(@Body() body: any) {
    return this.authService.register(body.email, body.password, body.fullName, body.phone);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with Email/Phone and Password or get OTP' })
  async login(@Body() body: any) {
    return this.authService.login(body.email || body.emailOrPhone || body.phone, body.password);
  }

  @Post(['google', 'verify'])
  @ApiOperation({ summary: 'Continue with Google / Gmail Sign In' })
  async googleLogin(@Body() body: any) {
    return this.authService.googleLogin(body);
  }

  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP to Mobile Number' })
  async sendOtp(@Body() body: any) {
    return this.authService.sendOtp(body.phone);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and get JWT Token' })
  async verifyOtp(@Body() body: any) {
    return this.authService.verifyOtp(body.identifier || body.email || body.emailOrPhone || body.phone, body.otp);
  }

  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend OTP to Email' })
  async resendOtp(@Body() body: any) {
    return this.authService.resendOtp(body.identifier || body.email || body.emailOrPhone || body.phone);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@GetUser() user: any) {
    return this.authService.getMe(user.sub || user.id);
  }

  @Get(['history', 'login-history'])
  @ApiOperation({ summary: 'Get login history and security audit logs' })
  async getLoginHistory(@GetUser() user: any) {
    return this.authService.getLoginHistory(user?.sub || user?.id);
  }
}
