import { IsDateString, IsInt, IsString, IsUUID, Matches, Min } from 'class-validator';

export class CreateScheduleDto {
  @IsUUID()
  class_id: string;

  @IsDateString()
  date: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'start_time debe tener formato HH:MM o HH:MM:SS' })
  start_time: string;

  @IsInt()
  @Min(1)
  available_spots: number;
}
