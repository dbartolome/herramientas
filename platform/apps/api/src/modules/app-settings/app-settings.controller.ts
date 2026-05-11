import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from '../auth/audit.service';
import { AdminTokenGuard } from '../auth/guards/admin-token.guard';
import { extractRequestIp } from '../auth/request-ip.util';
import { UserAuthService } from '../user-auth/user-auth.service';
import { UpdateGlobalSettingsDto } from './app-settings.dto';
import { AppSettingsService } from './app-settings.service';

@Controller()
export class AppSettingsController {
  constructor(
    private readonly settings: AppSettingsService,
    private readonly users: UserAuthService,
    private readonly audit: AuditService,
  ) {}

  @Get('settings/public')
  getPublic() {
    return this.settings.getGlobal();
  }

  @Get('me/settings')
  async getMySettings(@Req() req: Request) {
    const user = await this.users.requireUser(req);
    return { preferences: user.preferences };
  }

  @Put('me/settings')
  async updateMySettings(
    @Req() req: Request,
    @Body() body: { themeMode?: 'light' | 'dark' | 'system' },
  ) {
    const user = await this.users.requireUser(req);
    const updated = await this.users.updatePrefs(user.id, body.themeMode);
    return { preferences: updated.preferences };
  }

  @Get('admin/settings')
  @UseGuards(AdminTokenGuard)
  getAdminSettings() {
    return this.settings.getGlobal();
  }

  @Put('admin/settings')
  @UseGuards(AdminTokenGuard)
  async updateAdminSettings(
    @Req() req: Request,
    @Body() body: UpdateGlobalSettingsDto,
  ) {
    const updated = await this.settings.updateGlobal(body);
    await this.audit.log({
      at: new Date().toISOString(),
      action: 'admin_settings_update',
      ip: extractRequestIp(req),
      actor: 'admin',
      detail: { fields: Object.keys(body) },
    });
    return updated;
  }
}
