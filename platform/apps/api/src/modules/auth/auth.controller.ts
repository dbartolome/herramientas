import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AdminLoginDto } from './admin-login.dto';
import { AuthService } from './auth.service';
import { AdminTokenGuard } from './guards/admin-token.guard';
import { extractRequestIp } from './request-ip.util';

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: AdminLoginDto,
    @Req() req: Request,
  ) {
    return this.authService.login(body.password, extractRequestIp(req));
  }

  @Post('logout')
  @UseGuards(AdminTokenGuard)
  async logout(@Req() req: Request) {
    const auth = req.headers.authorization ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
    return this.authService.logout(token, extractRequestIp(req));
  }
}
