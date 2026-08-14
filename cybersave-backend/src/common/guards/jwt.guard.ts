import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://your-keycloak.com';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'cybersave';
const JWKS_URI = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token missing.');
    }

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
      });
      // Keycloak sub represents the user ID
      (request as any).user = payload;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
