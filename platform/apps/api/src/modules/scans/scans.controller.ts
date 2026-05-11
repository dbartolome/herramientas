import { Body, Controller, Get, NotFoundException, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { join, basename } from 'node:path';
import { access } from 'node:fs/promises';
import { CreateScanDto } from './create-scan.dto';
import { ScansService } from './scans.service';
import { UserAuthService } from '../user-auth/user-auth.service';

@Controller('scans')
export class ScansController {
  constructor(
    private readonly scansService: ScansService,
    private readonly userAuthService: UserAuthService,
  ) {}

  @Post()
  async create(
    @Body() body: CreateScanDto,
    @Req() req: Request,
  ) {
    const user = await this.userAuthService.resolveUserFromRequest(req);
    return this.scansService.createScan(body, user?.id ?? null);
  }

  @Get('/evidence/:fileName')
  async getEvidence(@Param('fileName') fileName: string, @Res() res: Response) {
    const safe = basename(fileName);
    const filePath = join(__dirname, '../../../../../workers/security_worker/evidence', safe);
    try {
      await access(filePath);
      return res.sendFile(filePath);
    } catch {
      throw new NotFoundException('evidence_not_found');
    }
  }

  @Get('/me/history')
  async myHistory(
    @Req() req: Request,
    @Query('limit') limit?: string,
  ) {
    const user = await this.userAuthService.requireUser(req);
    return this.scansService.listScansByUser(user.id, limit ? Number(limit) : 100);
  }

  @Get(':scanId')
  async getById(@Param('scanId') scanId: string) {
    return this.scansService.getScanById(scanId);
  }
}
