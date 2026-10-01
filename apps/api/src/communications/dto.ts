import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsString()
  @IsIn(['ALL', 'STUDENT', 'FACULTY_STAFF', 'CLINIC_STAFF'])
  audience!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
