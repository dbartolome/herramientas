import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateScanDto } from './create-scan.dto';
import { ScansQueue } from './scans.queue';
import { ScansRepository } from './scans.repository';
import { AdminToolsService } from '../admin-tools/admin-tools.service';
import { AppSettingsService } from '../app-settings/app-settings.service';

@Injectable()
export class ScansService {
  constructor(
    private readonly repository: ScansRepository,
    private readonly scansQueue: ScansQueue,
    private readonly adminToolsService: AdminToolsService,
    private readonly appSettingsService: AppSettingsService,
  ) {}

  async createScan(dto: CreateScanDto, ownerUserId?: string | null) {
    const toolConfig = await this.adminToolsService.getByType(dto.type);
    if (!toolConfig.enabled) {
      throw new BadRequestException(`La herramienta ${dto.type} está desactivada por administración`);
    }

    const global = await this.appSettingsService.getGlobal();
    if (!ownerUserId && !global.allowAnonymousScans) {
      throw new BadRequestException('Los análisis anónimos están desactivados. Debes iniciar sesión.');
    }

    if (dto.asset.length > toolConfig.maxAssetLength) {
      throw new BadRequestException(
        `El asset supera la longitud máxima permitida para ${dto.type} (${toolConfig.maxAssetLength})`,
      );
    }

    const mergedParams = {
      ...toolConfig.defaultParams,
      ...(dto.params ?? {}),
    };

    const scan = await this.repository.create({
      type: dto.type,
      asset: dto.asset,
      params: mergedParams,
      ownerUserId: ownerUserId ?? null,
    });

    await this.scansQueue.enqueue({
      scanId: scan.id,
      type: scan.type,
      asset: scan.asset,
      params: scan.params,
    });

    return scan;
  }

  async getScanById(scanId: string) {
    const scan = await this.repository.findById(scanId);
    if (!scan) {
      throw new NotFoundException(`Scan ${scanId} no encontrado`);
    }
    return scan;
  }

  async listScansByUser(userId: string, limit = 100) {
    return this.repository.listByUser(userId, limit);
  }
}
