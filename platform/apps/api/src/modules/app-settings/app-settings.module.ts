import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserAuthModule } from '../user-auth/user-auth.module';
import { AppSettingsController } from './app-settings.controller';
import { AppSettingsService } from './app-settings.service';

@Module({
  imports: [AuthModule, UserAuthModule],
  controllers: [AppSettingsController],
  providers: [AppSettingsService],
  exports: [AppSettingsService],
})
export class AppSettingsModule {}
