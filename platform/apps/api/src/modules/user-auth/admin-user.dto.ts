import { IsEnum, IsOptional } from 'class-validator';
import { UserPlan, UserRole } from './user-role.enum';

export class UpdateUserAdminDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserPlan)
  plan?: UserPlan;
}
