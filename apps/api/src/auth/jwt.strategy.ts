import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtSecrets } from './jwt-secrets';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(secrets: JwtSecrets) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Throws rather than defaulting: a predictable access-token key would let
      // anyone mint an administrator token.
      secretOrKey: secrets.accessSecret,
    });
  }

  validate(payload: { sub: string; email: string; roles: string[]; patientId?: string | null }) {
    return { id: payload.sub, email: payload.email, roles: payload.roles, patientId: payload.patientId };
  }
}
