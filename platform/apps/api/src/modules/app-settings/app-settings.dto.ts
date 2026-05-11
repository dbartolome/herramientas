import { IsBoolean, IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGlobalSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brandName?: string;

  @IsOptional()
  @IsString()
  themeMode?: 'light' | 'dark' | 'system';

  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  @IsOptional()
  @IsBoolean()
  allowAnonymousScans?: boolean;
}
