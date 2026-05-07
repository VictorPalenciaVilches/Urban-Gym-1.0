import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class RecordWorkoutDto {
  @IsString()
  member_id: string;

  @IsString()
  @IsOptional()
  machine_id?: string;

  @IsString()
  @IsOptional()
  machine_name?: string;

  @IsString()
  @IsOptional()
  machine_type?: string;

  @IsNumber()
  duration_minutes: number;

  @IsNumber()
  @IsOptional()
  calories?: number;

  @IsObject()
  @IsOptional()
  metrics?: Record<string, any>;

  @IsString()
  @IsOptional()
  source?: string; // 'iot' | 'class' | 'manual'
}
