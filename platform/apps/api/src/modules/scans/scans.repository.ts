import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ScanType } from './scan-type.enum';

export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface ScanRecord {
  id: string;
  type: ScanType;
  asset: string;
  params: Record<string, unknown>;
  ownerUserId?: string | null;
  status: ScanStatus;
  createdAt: string;
  updatedAt: string;
  result?: Record<string, unknown> | null;
}

@Injectable()
export class ScansRepository {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    const host = config.get<string>('REDIS_HOST') ?? 'localhost';
    const port = Number(config.get<string>('REDIS_PORT') ?? 6379);
    this.redis = new Redis({ host, port });
  }

  private key(scanId: string): string {
    return `scan:${scanId}`;
  }

  private userScansKey(userId: string): string {
    return `user-scans:${userId}`;
  }

  async create(input: { type: ScanType; asset: string; params?: Record<string, unknown>; ownerUserId?: string | null }): Promise<ScanRecord> {
    const now = new Date().toISOString();
    const scan: ScanRecord = {
      id: randomUUID(),
      type: input.type,
      asset: input.asset,
      params: input.params ?? {},
      ownerUserId: input.ownerUserId ?? null,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
      result: null,
    };

    await this.redis.set(this.key(scan.id), JSON.stringify(scan));
    if (scan.ownerUserId) {
      await this.redis.lpush(this.userScansKey(scan.ownerUserId), scan.id);
      await this.redis.ltrim(this.userScansKey(scan.ownerUserId), 0, 999);
    }
    return scan;
  }

  async findById(id: string): Promise<ScanRecord | null> {
    const raw = await this.redis.get(this.key(id));
    if (!raw) return null;
    return JSON.parse(raw) as ScanRecord;
  }

  async listByUser(userId: string, limit = 100): Promise<ScanRecord[]> {
    const ids = await this.redis.lrange(this.userScansKey(userId), 0, Math.max(1, Math.min(limit, 500)) - 1);
    if (ids.length === 0) return [];
    const records = await Promise.all(ids.map((id) => this.findById(id)));
    return records.filter((r): r is ScanRecord => Boolean(r));
  }
}
