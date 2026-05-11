import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class AdminTokenGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const expectedToken = this.config.get<string>('ADMIN_TOKEN')?.trim() ?? '';

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta Authorization Bearer token');
    }

    const receivedToken = auth.slice('Bearer '.length).trim();
    if (!receivedToken) {
      throw new UnauthorizedException('Token de administración inválido');
    }

    if (expectedToken && receivedToken === expectedToken) {
      return true;
    }

    const sessionValid = await this.authService.isSessionTokenValid(receivedToken);
    if (!sessionValid) {
      throw new UnauthorizedException('Token de administración inválido');
    }

    return true;
  }
}
