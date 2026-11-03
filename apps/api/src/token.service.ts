import { Injectable } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';

@Injectable()
export class TokenService {
  private readonly secret = process.env.JWT_SECRET || 'development-secret-change-before-production';
  sign(payload: { sub: string; tenantId: string; role: string }) {
    return sign(payload, this.secret, { expiresIn: '8h' });
  }
  verify(token: string) {
    return verify(token, this.secret) as { sub: string; tenantId: string; role: string };
  }
}
