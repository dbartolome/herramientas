import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AdminTokenGuard } from '../auth/guards/admin-token.guard';
import { UpdateUserAdminDto } from './admin-user.dto';
import { UserLoginDto, UserPrefsDto, UserRegisterDto } from './user-auth.dto';
import { UserAuthService } from './user-auth.service';

@Controller('auth')
export class UserAuthController {
  constructor(private readonly userAuthService: UserAuthService) {}

  @Post('register')
  register(@Body() body: UserRegisterDto) {
    return this.userAuthService.register(body.email, body.password);
  }

  @Post('login')
  login(@Body() body: UserLoginDto) {
    return this.userAuthService.login(body.email, body.password);
  }

  @Get('me')
  async me(@Req() req: Request) {
    return this.userAuthService.requireUser(req);
  }

  @Patch('me/preferences')
  async prefs(
    @Req() req: Request,
    @Body() body: UserPrefsDto,
  ) {
    const user = await this.userAuthService.requireUser(req);
    return this.userAuthService.updatePrefs(user.id, body.themeMode);
  }

  @Get('admin/users')
  @UseGuards(AdminTokenGuard)
  listUsers(@Query('limit') limit?: string) {
    return this.userAuthService.listUsers(limit ? Number(limit) : 200);
  }

  @Put('admin/users/:userId')
  @UseGuards(AdminTokenGuard)
  updateUser(
    @Param('userId') userId: string,
    @Body() body: UpdateUserAdminDto,
  ) {
    return this.userAuthService.updateUserAdmin(userId, body);
  }
}
