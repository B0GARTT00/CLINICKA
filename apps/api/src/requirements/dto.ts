import { RequirementStatus } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRequirementDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  applicableTo!: string;

  @IsOptional() @IsArray() @IsString({ each: true }) departmentIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) programIds?: string[];
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(1, { each: true }) yearLevels?: number[];

  @IsString()
  academicYearId!: string;

  @IsOptional()
  @IsString()
  semesterId?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}

export class CreateSubmissionDto {
  @IsString()
  requirementId!: string;

  @IsString()
  patientId!: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ReviewSubmissionDto {
  @IsEnum(RequirementStatus)
  status!: RequirementStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
