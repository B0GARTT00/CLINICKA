import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { VisitStatus } from '@prisma/client';

export class CreateVisitDto {
  @IsString()
  patientId!: string;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateVisitStatusDto {
  @IsEnum(VisitStatus)
  status!: VisitStatus;
}

export class CreateVitalSignDto {
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(50)
  temperatureC?: number;

  @IsOptional()
  @IsInt()
  @Min(40)
  @Max(300)
  systolicBp?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(200)
  diastolicBp?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(250)
  pulseRate?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(100)
  respiratoryRate?: number;

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(100)
  oxygenSaturation?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(250)
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  weightKg?: number;
}

export class DiagnosisDto {
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TreatmentDto {
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PrescriptionItemDto {
  @IsString()
  medicineName!: string;

  @IsString()
  dosage!: string;

  @IsString()
  frequency!: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsInt()
  quantity?: number;
}

export class CreateConsultationDto {
  @IsOptional()
  @IsString()
  cues?: string;

  @IsOptional()
  @IsString()
  nursingDiagnosis?: string;

  @IsOptional()
  @IsString()
  nursingIntervention?: string;

  @IsOptional()
  @IsString()
  medicalDiagnosis?: string;

  @IsOptional()
  @IsString()
  medicalIntervention?: string;

  @IsOptional()
  @IsString()
  evaluation?: string;

  @IsOptional()
  @IsString()
  subjective?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  assessment?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosisDto)
  diagnoses?: DiagnosisDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TreatmentDto)
  treatments?: TreatmentDto[];

  @IsOptional()
  @IsString()
  prescriptionInstructions?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  prescriptionItems?: PrescriptionItemDto[];
}
