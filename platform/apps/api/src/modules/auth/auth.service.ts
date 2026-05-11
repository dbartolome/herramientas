import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import { AuditService } from './audit.service';

@Injectable()
export class AuthService {
  private readonly redis: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {
    const host = this.config.get<string>('REDIS_HOST') ?? 'localhost';
    const port = Number(this.config.get<string>('REDIS_PORT') ?? 6379);
    this.redis = new Redis({ host, port });
  }

  private sessionKey(token: string): string {
    return `admin-session:${token}`;
  }

  private failKey(ip: string): string {
    return `admin-login-fails:${ip}`;
  }

  private blockKey(ip: string): string {
    return `admin-login-block:${ip}`;
  }

  private async assertNotBlocked(ip: string): Promise<void> {
    const blocked = await this.redis.get(this.blockKey(ip));
    if (blocked === '1') {
      throw new HttpException(
        'Acceso temporalmente bloqueado por intentos fallidos',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async registerFailedAttempt(ip: string): Promise<void> {
    const maxAttempts = Number(this.config.get<string>('ADMIN_LOGIN_MAX_ATTEMPTS') ?? 5);
    const windowSec = Number(this.config.get<string>('ADMIN_LOGIN_WINDOW_SEC') ?? 900);
    const blockSec = Number(this.config.get<string>('ADMIN_LOGIN_BLOCK_SEC') ?? 900);

    const fails = await this.redis.incr(this.failKey(ip));
    if (fails === 1) {
      await this.redis.expire(this.failKey(ip), windowSec);
    }

    if (fails >= maxAttempts) {
      await this.redis.set(this.blockKey(ip), '1', 'EX', blockSec);
      await this.redis.del(this.failKey(ip));
      throw new HttpException(
        'Demasiados intentos fallidos. Acceso bloqueado temporalmente',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async clearFailedAttempts(ip: string): Promise<void> {
    await this.redis.del(this.failKey(ip));
  }

  async login(password: string, ip: string): Promise<{ token: string; expiresInSec: number }> {
    await this.assertNotBlocked(ip);

    const expectedPassword = this.config.get<string>('ADMIN_PASSWORD')?.trim();
    if (!expectedPassword) {
      throw new UnauthorizedException('ADMIN_PASSWORD no configurado en la API');
    }

    if (password !== expectedPassword) {
      await this.registerFailedAttempt(ip);
      await this.auditService.log({
        at: new Date().toISOString(),
        action: 'admin_login_failed',
        ip,
        actor: 'anonymous',
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.clearFailedAttempts(ip);
    const token = `adm_${randomBytes(24).toString('hex')}`;
    const expiresInSec = Number(this.config.get<string>('ADMIN_SESSION_TTL_SEC') ?? 43200);
    await this.redis.set(this.sessionKey(token), '1', 'EX', expiresInSec);
    await this.auditService.log({
      at: new Date().toISOString(),
      action: 'admin_login_success',
      ip,
      actor: 'admin',
      detail: { expiresInSec },
    });
    return { token, expiresInSec };
  }

  async isSessionTokenValid(token: string): Promise<boolean> {
    const value = await this.redis.get(this.sessionKey(token));
    return value === '1';
  }

  async logout(token: string, ip: string): Promise<{ revoked: boolean }> {
    if (!token.startsWith('adm_')) {
      await this.auditService.log({
        at: new Date().toISOString(),
        action: 'admin_logout_static_token',
        ip,
        actor: 'admin',
      });
      return { revoked: false };
    }

    const deleted = await this.redis.del(this.sessionKey(token));
    await this.auditService.log({
      at: new Date().toISOString(),
      action: 'admin_logout_session',
      ip,
      actor: 'admin',
      detail: { revoked: deleted > 0 },
    });
    return { revoked: deleted > 0 };
  }
}
