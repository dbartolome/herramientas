import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ScanType } from './scan-type.enum';

export class CreateScanDto {
  @IsEnum(ScanType)
  type!: ScanType;

  @IsString()
  @MaxLength(255)
  asset!: string;

  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}
