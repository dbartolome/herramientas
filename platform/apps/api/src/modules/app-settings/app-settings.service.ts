import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DEFAULT_GLOBAL_SETTINGS, GlobalAppSettings } from './app-settings.model';
import { UpdateGlobalSettingsDto } from './app-settings.dto';

@Injectable()
export class AppSettingsService {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    const host = config.get<string>('REDIS_HOST') ?? 'localhost';
    const port = Number(config.get<string>('REDIS_PORT') ?? 6379);
    this.redis = new Redis({ host, port });
  }

  private key(): string {
    return 'app-settings:global';
  }

  async getGlobal(): Promise<GlobalAppSettings> {
    const raw = await this.redis.get(this.key());
    if (!raw) {
      return {
        ...DEFAULT_GLOBAL_SETTINGS,
        updatedAt: new Date().toISOString(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<GlobalAppSettings>;
    return {
      ...DEFAULT_GLOBAL_SETTINGS,
      ...parsed,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  }

  async updateGlobal(dto: UpdateGlobalSettingsDto): Promise<GlobalAppSettings> {
    const current = await this.getGlobal();
    const next: GlobalAppSettings = {
      ...current,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    await this.redis.set(this.key(), JSON.stringify(next));
    return next;
  }
}
