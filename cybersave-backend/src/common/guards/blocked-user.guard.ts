import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Rejects operations from citizens whose account is BLOCKED or SUSPENDED.
 *
 * Resolves the acting user id from, in order:
 *   1. request.user (set by JwtAuthGuard: { sub | id })
 *   2. request.query.userId (GET endpoints that take userId as a query param)
 *   3. request.body.userId (POST endpoints that take userId in the body)
 *
 * The DB is re-checked on every request so a stale token or a spoofed userId
 * cannot keep authorizing a blocked citizen.
 */
@Injectable()
export class BlockedUserGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const payload = (request as any).user;

    const userId =
      payload?.sub ||
      payload?.id ||
      payload?.userId ||
      (request as any).query?.userId ||
      (request as any).body?.userId;

    if (!userId || typeof userId !== 'string') {
      // No user context (e.g. anonymous/public route): nothing to enforce.
      return true;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: String(userId) },
      select: { id: true, status: true },
    });

    if (user && (user.status === 'BLOCKED' || user.status === 'SUSPENDED')) {
      throw new ForbiddenException(
        'Your account has been blocked by the Administrator. Please contact support.',
      );
    }

    return true;
  }
}
