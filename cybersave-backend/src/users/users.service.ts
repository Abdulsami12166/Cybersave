import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  async softDelete(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        status: 'DELETED',
        isOnline: false,
      },
    });

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_DELETED',
        details: 'User account permanently deleted by owner from mobile settings',
      },
    });

    try {
      const { AdminGateway } = require('../admin/admin.gateway');
      AdminGateway.broadcast('user_status_changed', {
        userId,
        status: 'DELETED',
        isOnline: false,
        lastSeenAt: new Date().toISOString(),
      });
      AdminGateway.broadcast('users_updated');
    } catch (_) {}

    return { message: 'Account successfully deleted.' };
  }
}
