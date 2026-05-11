import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from '../auth/audit.service';
import { AdminTokenGuard } from '../auth/guards/admin-token.guard';
import { extractRequestIp } from '../auth/request-ip.util';
import { ScanType } from '../scans/scan-type.enum';
import { AdminToolsService } from './admin-tools.service';
import { UpdateToolConfigDto } from './update-tool-config.dto';

@Controller('admin/tools')
@UseGuards(AdminTokenGuard)
export class AdminToolsController {
  constructor(
    private readonly adminToolsService: AdminToolsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  listTools() {
    return this.adminToolsService.listAll();
  }

  @Get(':type')
  getTool(@Param('type') type: ScanType) {
    return this.adminToolsService.getByType(type);
  }

  @Put(':type')
  updateTool(
    @Param('type') type: ScanType,
    @Body() body: UpdateToolConfigDto,
    @Req() req: Request,
  ) {
    return this.adminToolsService.update(type, body).then(async (updated) => {
      await this.auditService.log({
        at: new Date().toISOString(),
        action: 'admin_tool_update',
        ip: extractRequestIp(req),
        actor: 'admin',
        detail: { type, fields: Object.keys(body) },
      });
      return updated;
    });
  }
}
