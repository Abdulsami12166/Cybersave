import { Controller, Get, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator';

@ApiTags('User Account')
@Controller('api/v1/user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user account and profile' })
  @ApiResponse({ status: 200, description: 'User account data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@GetUser('sub') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Delete('deactivate')
  @ApiOperation({ summary: 'Soft delete current user account' })
  @ApiResponse({ status: 200, description: 'Account deactivated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deactivate(@GetUser('sub') userId: string) {
    return this.usersService.softDelete(userId);
  }
}
