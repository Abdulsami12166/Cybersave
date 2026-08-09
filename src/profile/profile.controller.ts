import { Controller, Put, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator';

@ApiTags('Profile')
@Controller(['api/v1/profile', 'profile'])
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Put()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @GetUser('sub') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.update(userId, updateProfileDto);
  }

  @Post('upload-avatar')
  @ApiOperation({ summary: 'Upload profile photo avatar to Cloudinary' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully to Cloudinary' })
  async uploadAvatar(
    @GetUser('sub') userId: string,
    @Body() body: { base64Image: string },
  ) {
    return this.profileService.uploadAvatar(userId, body.base64Image);
  }
}
