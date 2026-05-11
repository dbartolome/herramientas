import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ScanType } from '../scans/scan-type.enum';
import { DEFAULT_TOOL_CONFIGS, ToolConfig } from './tool-config.model';
import { UpdateToolConfigDto } from './update-tool-config.dto';

@Injectable()
export class AdminToolsService {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    const host = config.get<string>('REDIS_HOST') ?? 'localhost';
    const port = Number(config.get<string>('REDIS_PORT') ?? 6379);
    this.redis = new Redis({ host, port });
  }

  private key(type: ScanType): string {
    return `tool-config:${type}`;
  }

  private withTimestamp(type: ScanType, cfg: Omit<ToolConfig, 'updatedAt'>): ToolConfig {
    return {
      ...cfg,
      type,
      updatedAt: new Date().toISOString(),
    };
  }

  async getByType(type: ScanType): Promise<ToolConfig> {
    const raw = await this.redis.get(this.key(type));
    if (!raw) {
      return this.withTimestamp(type, DEFAULT_TOOL_CONFIGS[type]);
    }
    const parsed = JSON.parse(raw) as Partial<ToolConfig>;
    const merged: ToolConfig = {
      ...DEFAULT_TOOL_CONFIGS[type],
      ...parsed,
      type,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
    return merged;
  }

  async listAll(): Promise<ToolConfig[]> {
    const types = Object.values(ScanType);
    const records = await Promise.all(types.map((type) => this.getByType(type)));
    return records;
  }

  async update(type: ScanType, dto: UpdateToolConfigDto): Promise<ToolConfig> {
    if (!Object.values(ScanType).includes(type)) {
      throw new NotFoundException(`Tipo de herramienta no soportado: ${type}`);
    }

    const current = await this.getByType(type);
    const next: ToolConfig = {
      ...current,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    await this.redis.set(this.key(type), JSON.stringify(next));
    return next;
  }
}
