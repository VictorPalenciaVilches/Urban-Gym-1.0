import { IsString, IsIn, IsOptional } from 'class-validator';

export class SubscribeDto {
  @IsString()
  @IsIn(['basic', 'premium', 'vip'])
  plan: string;
}

export class MemberCreatedDto {
  @IsString()
  member_id: string;

  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsString()
  @IsOptional()
  plan?: string;
}
