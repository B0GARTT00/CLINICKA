import { Disposition, EmergencyType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateEmergencyCaseDto {
  @IsString()
  patientId!: string;

  @IsOptional()
  @IsString()
  clinicVisitId?: string;

  @IsDateString()
  occurredAt!: string;

  @IsEnum(EmergencyType)
  emergencyType!: EmergencyType;

  @IsString()
  description!: string;

  @IsString()
  actionTaken!: string;

  @IsOptional()
  @IsString()
  treatment?: string;

  @IsOptional()
  @IsEnum(Disposition)
  disposition?: Disposition;

  @IsOptional()
  @IsString()
  remarks?: string;
}
