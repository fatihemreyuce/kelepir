import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, JwtFromRequestFunction } from 'passport-jwt';
import { Request } from 'express';
import { authConfig } from '../../config/auth.config';
import { AuthUser, JwtPayload } from '../types/jwt-payload';

const cookieExtractor: JwtFromRequestFunction = (req: Request) => {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.access_token ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: authConfig().accessSecret,
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return { userId: payload.sub, email: payload.email };
  }
}
