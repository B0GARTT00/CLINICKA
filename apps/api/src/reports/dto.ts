import { PatientType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

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
}
