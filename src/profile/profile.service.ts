import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async update(userId: string, updateProfileDto: UpdateProfileDto) {
    const updatedProfile = await this.prisma.profile.upsert({
      where: { userId },
      update: updateProfileDto,
      create: {
        userId,
        ...updateProfileDto,
      },
    });

    // Sync User table email/phone if provided
    const userUpdateData: any = {};
    if (updateProfileDto.email) userUpdateData.email = updateProfileDto.email.trim().toLowerCase();
    if (updateProfileDto.phone) userUpdateData.phone = updateProfileDto.phone.trim();
    
    if (Object.keys(userUpdateData).length > 0) {
      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: userUpdateData,
        });
      } catch (e) {}
    }

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
