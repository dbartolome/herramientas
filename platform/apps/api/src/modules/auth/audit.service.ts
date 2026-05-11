import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface AuditEvent {
  at: string;
  action: string;
  ip: string;
  actor: string;
  detail?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly redis: Redis;
  private readonly maxItems: number;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST') ?? 'localhost';
    const port = Number(this.config.get<string>('REDIS_PORT') ?? 6379);
    this.redis = new Redis({ host, port });
    this.maxItems = Number(this.config.get<string>('ADMIN_AUDIT_MAX_ITEMS') ?? 500);
  }

  private key(): string {
    return 'admin-audit-log';
  }

  async log(event: AuditEvent): Promise<void> {
    await this.redis.lpush(this.key(), JSON.stringify(event));
    await this.redis.ltrim(this.key(), 0, this.maxItems - 1);
  }

  async list(limit = 100): Promise<AuditEvent[]> {
    const safeLimit = Math.max(1, Math.min(limit, this.maxItems));
    const rows = await this.redis.lrange(this.key(), 0, safeLimit - 1);
    return rows.map((row) => JSON.parse(row) as AuditEvent);
  }
}
