import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { TokenService } from './token.service';

export type SessionUser = { userId: string; tenantId: string; role: string };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: TokenService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request & { user?: SessionUser }>();
    const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;
    const token = req.cookies?.rootiq_session || bearer;
    if (!token) throw new UnauthorizedException('Sign in required');
    try {
      const payload = this.jwt.verify(token);
      req.user = { userId: payload.sub, tenantId: payload.tenantId, role: payload.role };
      return true;
    } catch { throw new UnauthorizedException('Session expired'); }
  }
}
