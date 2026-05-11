import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminToolsController } from './admin-tools.controller';
import { AdminToolsService } from './admin-tools.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminToolsController],
  providers: [AdminToolsService],
  exports: [AdminToolsService],
})
export class AdminToolsModule {}
