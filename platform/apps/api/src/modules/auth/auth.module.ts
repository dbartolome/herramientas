import { Module } from '@nestjs/common';
import { AdminAuditController } from './admin-audit.controller';
import { AuthController } from './auth.controller';
import { AuditService } from './audit.service';
import { AuthService } from './auth.service';
import { AdminTokenGuard } from './guards/admin-token.guard';

@Module({
  controllers: [AuthController, AdminAuditController],
  providers: [AuthService, AuditService, AdminTokenGuard],
  exports: [AuthService, AuditService, AdminTokenGuard],
})
export class AuthModule {}
