import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async update(userId: string, updateProfileDto: UpdateProfileDto) {
    const userProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!userProfile) {
      throw new NotFoundException('Profile not found.');
    }

    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: updateProfileDto,
    });

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_PROFILE',
        details: 'User updated profile information',
      },
    });

    return updatedProfile;
  }
}
