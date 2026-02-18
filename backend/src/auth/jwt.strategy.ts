import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from './types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          const rawAuth = request?.headers?.authorization;
          if (!rawAuth) {
            return null;
          }

          let token = String(rawAuth).trim();
          token = token.replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '').trim();
          token = token.replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '').trim();

          return token || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret',
    });
  }

  validate(payload: { sub: number; userCode?: string; email?: string; role: string; stationId?: number | null; tenantId?: number | null; companyCode?: string; tenantDbMode?: 'SHARED' | 'DEDICATED' }): JwtUser {
    return {
      id: payload.sub,
      userCode: payload.userCode ?? null,
      email: payload.email ?? null,
      role: payload.role as JwtUser['role'],
      stationId: payload.stationId ?? null,
      tenantId: payload.tenantId ?? null,
      companyCode: payload.companyCode ?? null,
      tenantDbMode: payload.tenantDbMode ?? null,
    };
  }
}
