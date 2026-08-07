import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Firebase token and login/register user' })
  @ApiResponse({ status: 200, description: 'User successfully authenticated and JWT tokens issued' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async verify(@Body() verifyTokenDto: VerifyTokenDto) {
    return this.authService.verifyFirebaseToken(verifyTokenDto.token);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh custom access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Access token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out user and record audit log' })
  @ApiResponse({ status: 200, description: 'Logout audited successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@GetUser('sub') userId: string) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_LOGOUT',
        details: 'User initiated logout',
      },
    });
    return { message: 'Logged out successfully.' };
  }
}
