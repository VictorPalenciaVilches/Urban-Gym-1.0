import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateMemberDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  subscription_plan?: string;

  @IsString()
  @IsOptional()
  subscription_status?: string;

  @IsUUID()
  @IsOptional()
  role_id?: string;
}
