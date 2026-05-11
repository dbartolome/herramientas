import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { Request } from 'express';
import Redis from 'ioredis';
import { UserPlan, UserRole } from './user-role.enum';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  plan: UserPlan;
  preferences: { themeMode: 'light' | 'dark' | 'system' };
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UserAuthService {
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST') ?? 'localhost';
    const port = Number(this.config.get<string>('REDIS_PORT') ?? 6379);
    this.redis = new Redis({ host, port });
  }

  private userKey(id: string): string {
    return `user:${id}`;
  }

  private emailKey(email: string): string {
    return `user-email:${email.toLowerCase().trim()}`;
  }

  private sessionKey(token: string): string {
    return `user-session:${token}`;
  }

  private usersIndexKey(): string {
    return 'users:index';
  }

  private hashPassword(plain: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(plain, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(plain: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const digest = scryptSync(plain, salt, 64);
    const target = Buffer.from(hash, 'hex');
    return target.length === digest.length && timingSafeEqual(digest, target);
  }

  private publicUser(record: UserRecord) {
    const { passwordHash, ...user } = record;
    return user;
  }

  private extractBearer(req: Request): string | null {
    const auth = req.headers.authorization ?? '';
    if (!auth.startsWith('Bearer ')) return null;
    return auth.slice('Bearer '.length).trim();
  }

  async register(email: string, password: string) {
    const normalized = email.toLowerCase().trim();
    const exists = await this.redis.get(this.emailKey(normalized));
    if (exists) throw new BadRequestException('Email ya registrado');

    const now = new Date().toISOString();
    const user: UserRecord = {
      id: randomUUID(),
      email: normalized,
      passwordHash: this.hashPassword(password),
      role: UserRole.BASIC,
      plan: UserPlan.BASIC,
      preferences: { themeMode: 'system' },
      createdAt: now,
      updatedAt: now,
    };

    await this.redis.set(this.userKey(user.id), JSON.stringify(user));
    await this.redis.set(this.emailKey(normalized), user.id);
    await this.redis.sadd(this.usersIndexKey(), user.id);
    const session = await this.createSession(user.id);
    return { user: this.publicUser(user), ...session };
  }

  async login(email: string, password: string) {
    const normalized = email.toLowerCase().trim();
    const userId = await this.redis.get(this.emailKey(normalized));
    if (!userId) throw new UnauthorizedException('Credenciales inválidas');

    const raw = await this.redis.get(this.userKey(userId));
    if (!raw) throw new UnauthorizedException('Credenciales inválidas');
    const user = JSON.parse(raw) as UserRecord;

    if (!this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const session = await this.createSession(user.id);
    return { user: this.publicUser(user), ...session };
  }

  async createSession(userId: string): Promise<{ token: string; expiresInSec: number }> {
    const token = `usr_${randomBytes(24).toString('hex')}`;
    const expiresInSec = Number(this.config.get<string>('USER_SESSION_TTL_SEC') ?? 604800);
    await this.redis.set(this.sessionKey(token), userId, 'EX', expiresInSec);
    return { token, expiresInSec };
  }

  async resolveUserFromRequest(req: Request): Promise<ReturnType<UserAuthService['publicUser']> | null> {
    const token = this.extractBearer(req);
    if (!token) return null;
    const userId = await this.redis.get(this.sessionKey(token));
    if (!userId) return null;
    const raw = await this.redis.get(this.userKey(userId));
    if (!raw) return null;
    const user = JSON.parse(raw) as UserRecord;
    return this.publicUser(user);
  }

  async requireUser(req: Request) {
    const user = await this.resolveUserFromRequest(req);
    if (!user) throw new UnauthorizedException('Debes iniciar sesión');
    return user;
  }

  async updatePrefs(userId: string, themeMode?: 'light' | 'dark' | 'system') {
    const raw = await this.redis.get(this.userKey(userId));
    if (!raw) throw new UnauthorizedException('Usuario no encontrado');
    const user = JSON.parse(raw) as UserRecord;
    user.preferences = {
      ...user.preferences,
      ...(themeMode ? { themeMode } : {}),
    };
    user.updatedAt = new Date().toISOString();
    await this.redis.set(this.userKey(user.id), JSON.stringify(user));
    return this.publicUser(user);
  }

  async listUsers(limit = 200) {
    const ids = await this.redis.smembers(this.usersIndexKey());
    const selected = ids.slice(0, Math.max(1, Math.min(limit, 1000)));
    const users = await Promise.all(
      selected.map(async (id) => {
        const raw = await this.redis.get(this.userKey(id));
        if (!raw) return null;
        return this.publicUser(JSON.parse(raw) as UserRecord);
      }),
    );
    return users.filter((u) => Boolean(u));
  }

  async updateUserAdmin(userId: string, input: { role?: UserRole; plan?: UserPlan }) {
    const raw = await this.redis.get(this.userKey(userId));
    if (!raw) throw new BadRequestException('Usuario no encontrado');
    const user = JSON.parse(raw) as UserRecord;
    if (input.role) user.role = input.role;
    if (input.plan) user.plan = input.plan;
    user.updatedAt = new Date().toISOString();
    await this.redis.set(this.userKey(user.id), JSON.stringify(user));
    return this.publicUser(user);
  }
}
