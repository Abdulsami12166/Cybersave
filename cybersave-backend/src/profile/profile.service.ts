import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminGateway } from '../admin/admin.gateway';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async update(userId: string, updateProfileDto: UpdateProfileDto) {
    // 1. Resolve valid MongoDB ObjectId for user
    let targetUserId = userId;
    const isMongoId = (s?: string) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);
    if (!isMongoId(targetUserId)) {
      try {
        const u = await this.prisma.user.findFirst({
          where: { OR: [{ email: targetUserId }, { phone: targetUserId }, { keycloakId: targetUserId }] },
          select: { id: true },
        });
        if (u?.id) targetUserId = u.id;
      } catch (_) {}
    }

    // 2. Strict whitelist of Profile schema fields to prevent Prisma 500 Unknown Argument errors
    const allowedKeys = [
      'fullName',
      'phone',
      'email',
      'avatarUrl',
      'address',
      'district',
      'state',
      'pinCode',
      'dob',
      'gender',
      'fatherName',
      'aadhaarNumber',
      'panNumber',
      'addresses',
    ];

    const profileData: any = {};
    for (const key of allowedKeys) {
      if ((updateProfileDto as any)[key] !== undefined) {
        profileData[key] = (updateProfileDto as any)[key];
      }
    }

    // Handle aadhaar / pan aliases
    const aadhaarVal = updateProfileDto.aadhaarNumber || updateProfileDto.aadhaar;
    if (aadhaarVal !== undefined && aadhaarVal !== null) {
      profileData.aadhaarNumber = String(aadhaarVal).trim();
    }
    const panVal = updateProfileDto.panNumber || updateProfileDto.pan;
    if (panVal !== undefined && panVal !== null) {
      profileData.panNumber = String(panVal).trim();
    }

    const updatedProfile = await this.prisma.profile.upsert({
      where: { userId: targetUserId },
      update: profileData,
      create: {
        userId: targetUserId,
        ...profileData,
      },
    });

    // Sync User table email/phone if provided
    const userUpdateData: any = {};
    if (updateProfileDto.email)
      userUpdateData.email = updateProfileDto.email.trim().toLowerCase();
    if (updateProfileDto.phone)
      userUpdateData.phone = updateProfileDto.phone.trim();

    if (Object.keys(userUpdateData).length > 0) {
      try {
        await this.prisma.user.update({
          where: { id: targetUserId },
          data: userUpdateData,
        });
      } catch (e) {}
    }

    // ponytail: Non-blocking audit log creation to return response immediately
    this.prisma.auditLog.create({
      data: {
        userId: targetUserId,
        action: 'UPDATE_PROFILE',
        details: 'User updated profile information / address',
      },
    }).catch(() => {});

    // Real-time broadcast to Admin Panel & Mobile
    try {
      AdminGateway.broadcast('user_updated', {
        userId: targetUserId,
        profile: updatedProfile,
        aadhaar: updatedProfile.aadhaarNumber,
        pan: updatedProfile.panNumber,
      });
      AdminGateway.broadcast('user_profile_updated', {
        userId: targetUserId,
        profile: updatedProfile,
        aadhaar: updatedProfile.aadhaarNumber,
        pan: updatedProfile.panNumber,
      });
      AdminGateway.broadcast('user_detail_updated', {
        ...updatedProfile,
        id: targetUserId,
        dbId: targetUserId,
        aadhaar: updatedProfile.aadhaarNumber,
        pan: updatedProfile.panNumber,
      });
      AdminGateway.broadcast('users_updated');
    } catch (e) {}

    return updatedProfile;
  }

  async uploadAvatar(userId: string, base64Image: string) {
    let targetUserId = userId;
    const isMongoId = (s?: string) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);
    if (!isMongoId(targetUserId)) {
      try {
        const u = await this.prisma.user.findFirst({
          where: { OR: [{ email: targetUserId }, { phone: targetUserId }, { keycloakId: targetUserId }] },
          select: { id: true },
        });
        if (u?.id) targetUserId = u.id;
      } catch (_) {}
    }

    const avatarUrl = await this.cloudinaryService.uploadBase64Image(
      base64Image,
      'cybersave/avatars',
    );

    const updatedProfile = await this.prisma.profile.upsert({
      where: { userId: targetUserId },
      update: { avatarUrl },
      create: { userId: targetUserId, avatarUrl },
    });

    try {
      AdminGateway.broadcast('user_updated', {
        userId: targetUserId,
        profile: updatedProfile,
        aadhaar: updatedProfile.aadhaarNumber,
        pan: updatedProfile.panNumber,
      });
      AdminGateway.broadcast('user_profile_updated', {
        userId: targetUserId,
        profile: updatedProfile,
        aadhaar: updatedProfile.aadhaarNumber,
        pan: updatedProfile.panNumber,
      });
      AdminGateway.broadcast('users_updated');
    } catch (_) {}

    return { success: true, avatarUrl: updatedProfile.avatarUrl };
  }

  // ponytail: get current authenticated user's profile with normalized addresses array
  async getProfile(userId: string) {
    let targetUserId = userId;
    const isMongoId = (s?: string) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);
    if (!isMongoId(targetUserId)) {
      try {
        const u = await this.prisma.user.findFirst({
          where: { OR: [{ email: targetUserId }, { phone: targetUserId }, { keycloakId: targetUserId }] },
          select: { id: true },
        });
        if (u?.id) targetUserId = u.id;
      } catch (_) {}
    }
    const profile = await this.prisma.profile.findUnique({ where: { userId: targetUserId } });
    if (!profile) return null;
    return {
      ...profile,
      addresses: Array.isArray(profile.addresses) ? profile.addresses : [],
    };
  }
}
