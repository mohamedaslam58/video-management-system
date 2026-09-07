import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import Redis from 'ioredis';
import { UsersService } from '../users/users.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;

@Injectable()
export class AuthService {
  private redis: Redis;

  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.redis = new Redis({
      host: config.get('REDIS_HOST'),
      port: parseInt(config.get('REDIS_PORT') || '6379', 10),
    });
  }

  private lockoutKey(email: string) {
    return `auth:lockout:${email}`;
  }
  private attemptsKey(email: string) {
    return `auth:attempts:${email}`;
  }
  private refreshKey(userId: string, jti: string) {
    return `auth:refresh:${userId}:${jti}`;
  }

  async validateCredentials(email: string, password: string) {
    const locked = await this.redis.get(this.lockoutKey(email));
    if (locked) {
      throw new ForbiddenException(
        'Account temporarily locked due to failed login attempts',
      );
    }

    const user = await this.users.findByEmail(email);
    const valid = user && (await argon2.verify(user.passwordHash, password));

    if (!valid) {
      const attempts = await this.redis.incr(this.attemptsKey(email));
      await this.redis.expire(this.attemptsKey(email), LOCKOUT_SECONDS);
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await this.redis.set(
          this.lockoutKey(email),
          '1',
          'EX',
          LOCKOUT_SECONDS,
        );
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.redis.del(this.attemptsKey(email));
    if (!user.isActive) {
      throw new ForbiddenException('Account disabled');
    }
    return user;
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    role: string;
    cameraGroupIds?: string[];
  }) {
    const jti = crypto.randomUUID();
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      cameraGroupIds: user.cameraGroupIds || [],
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_TTL') || '15m',
    });
    const refreshToken = this.jwt.sign(
      { ...payload, jti },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_TTL') || '7d',
      },
    );

    // store refresh token id so it can be revoked / rotated
    const ttlSeconds = 7 * 24 * 60 * 60;
    await this.redis.set(
      this.refreshKey(user.id, jti),
      '1',
      'EX',
      ttlSeconds,
    );

    return { accessToken, refreshToken };
  }

  async login(email: string, password: string) {
    const user = await this.validateCredentials(email, password);
    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
    };
  }

  async refresh(refreshToken: string) {
    let decoded: any;
    try {
      decoded = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const key = this.refreshKey(decoded.sub, decoded.jti);
    const exists = await this.redis.get(key);
    if (!exists) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    // rotate: invalidate old, issue new pair
    await this.redis.del(key);

    const user = await this.users.findById(decoded.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account no longer active');
    }
    return this.issueTokens(user);
  }

  async logout(userId: string, refreshToken: string) {
    try {
      const decoded: any = this.jwt.decode(refreshToken);
      if (decoded?.jti) {
        await this.redis.del(this.refreshKey(userId, decoded.jti));
      }
    } catch {
      // best-effort logout
    }
    return { success: true };
  }
}
