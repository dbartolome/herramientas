import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminTokenGuard } from './guards/admin-token.guard';
import { AuditService } from './audit.service';

@Controller('admin/audit')
@UseGuards(AdminTokenGuard)
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(@Query('limit') limit?: string) {
    return this.auditService.list(limit ? Number(limit) : 100);
  }
}
