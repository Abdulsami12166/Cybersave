import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://your-keycloak.com';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'cybersave';
const JWKS_URI = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

let JWKS: any;
try {
  JWKS = createRemoteJWKSet(new URL(JWKS_URI));
} catch (e) {
  // Ignored if keycloak is not configured
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token missing.');
    }

    let payload: any;

    try {
      payload = this.jwtService.verify(token);
    } catch (localErr) {
      if (JWKS) {
        try {
          const verified = await jwtVerify(token, JWKS, {
            issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
          });
          payload = verified.payload;
        } catch (keycloakErr) {
          throw new UnauthorizedException('Invalid or expired authentication token.');
        }
      } else {
        throw new UnauthorizedException('Invalid or expired authentication token.');
      }
    }

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }

    const userId = payload.sub || payload.id;
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found.');
      }

      if (user.status === 'BLOCKED') {
        throw new UnauthorizedException('Your account has been blocked by the Administrator.');
      }

      (request as any).user = { ...payload, status: user.status };
    } else {
      (request as any).user = payload;
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
