import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from './types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret',
    });
  }

  validate(payload: { sub: number; userCode?: string; email?: string; role: string; stationId?: string | null }): JwtUser {
    return {
      id: payload.sub,
      userCode: payload.userCode ?? null,
      email: payload.email ?? null,
      role: payload.role as JwtUser['role'],
      stationId: payload.stationId ?? null,
    };
  }
}
