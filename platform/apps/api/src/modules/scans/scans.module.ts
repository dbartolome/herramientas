import { Module } from '@nestjs/common';
import { ScansController } from './scans.controller';
import { ScansQueue } from './scans.queue';
import { ScansRepository } from './scans.repository';
import { ScansService } from './scans.service';
import { AdminToolsModule } from '../admin-tools/admin-tools.module';
import { UserAuthModule } from '../user-auth/user-auth.module';
import { AppSettingsModule } from '../app-settings/app-settings.module';

@Module({
  imports: [AdminToolsModule, UserAuthModule, AppSettingsModule],
  controllers: [ScansController],
  providers: [ScansService, ScansRepository, ScansQueue],
})
export class ScansModule {}
