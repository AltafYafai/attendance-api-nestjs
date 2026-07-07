import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

interface AccessTokenPayload {
  sub?: string;
  username?: string;
  role?: string;
  businessId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') as string,
      issuer: config.get<string>('jwt.issuer'),
      algorithms: ['HS256'],
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    if (!payload.sub || typeof payload.username !== 'string') {
      throw new UnauthorizedException('Malformed access token');
    }

    return {
      userId: payload.sub,
      username: payload.username,
      role: (payload.role as Role) ?? Role.PERSONAL,
      businessId: payload.businessId ?? null,
    };
  }
}
