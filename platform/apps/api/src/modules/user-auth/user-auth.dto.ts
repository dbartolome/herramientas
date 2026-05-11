import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UserRegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  password!: string;
}

export class UserLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  password!: string;
}

export class UserPrefsDto {
  @IsOptional()
  @IsString()
  themeMode?: 'light' | 'dark' | 'system';
}
