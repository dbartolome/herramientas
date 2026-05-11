import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { ScansModule } from './scans/scans.module';
import { AdminToolsModule } from './admin-tools/admin-tools.module';
import { UserAuthModule } from './user-auth/user-auth.module';
import { AppSettingsModule } from './app-settings/app-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    ScansModule,
    AdminToolsModule,
    UserAuthModule,
    AppSettingsModule,
  ],
})
export class AppModule {}
