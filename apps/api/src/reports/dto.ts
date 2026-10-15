import { PatientType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportDomain {
  ALL = 'ALL',
  CLINICAL = 'CLINICAL',
  COMPLIANCE = 'COMPLIANCE',
  INVENTORY = 'INVENTORY',
}

export class ReportFiltersDto {
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;

  @IsOptional()
  @IsEnum(ReportDomain)
  domain?: ReportDomain;

  @IsOptional()
  @IsEnum(PatientType)
  patientType?: PatientType;

  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() programId?: string;
  @IsOptional() @IsString() academicYearId?: string;
  @IsOptional() @IsString() semesterId?: string;
  @IsOptional() @IsIn(['WEEK', 'MONTH']) grouping?: 'WEEK' | 'MONTH';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
