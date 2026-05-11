import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ScanType } from './scan-type.enum';

export interface ScanJobPayload {
  scanId: string;
  type: ScanType;
  asset: string;
  params: Record<string, unknown>;
}

@Injectable()
export class ScansQueue {
  private readonly logger = new Logger(ScansQueue.name);
  private readonly redis: Redis;
  private readonly queueName: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('REDIS_HOST') ?? 'localhost';
    const port = Number(config.get<string>('REDIS_PORT') ?? 6379);
    this.queueName = config.get<string>('SCANS_QUEUE_NAME') ?? 'security-scans';

    this.redis = new Redis({ host, port });
  }

  async enqueue(payload: ScanJobPayload): Promise<void> {
    await this.redis.lpush(this.queueName, JSON.stringify(payload));
    this.logger.log(`Scan queued: ${payload.scanId} (${payload.type})`);
  }
}
