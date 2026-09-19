import { ClearanceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateClearanceDto {
  @IsString()
  patientId!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsString()
  semesterId?: string;
}

export class ReviewClearanceDto {
  @IsEnum(ClearanceStatus)
  status!: ClearanceStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}
