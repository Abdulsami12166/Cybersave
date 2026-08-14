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
      data: { deletedAt: new Date() },
    });

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_SOFT_DELETE',
        details: 'User account soft deleted by owner',
      },
    });

    return { message: 'Account successfully deactivated.' };
  }
}
