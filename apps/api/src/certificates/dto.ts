import { CertificateType } from '@prisma/client';
import { IsDateString, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateCertificateDto {
  @IsString()
  patientId!: string;

  @IsEnum(CertificateType)
  type!: CertificateType;

  @IsString()
  purpose!: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional() @IsString() findings?: string;
  @IsOptional() @IsString() fitnessStatus?: string;
  @IsOptional() @IsString() recommendations?: string;
  @IsOptional() @IsDateString() followUpAt?: string;
  @IsOptional() @IsString() referredTo?: string;
  @IsOptional() @IsString() confinementType?: string;
  @IsOptional() @IsDateString() confinementFrom?: string;
  @IsOptional() @IsDateString() confinementUntil?: string;
  @IsOptional() @IsString() physicianName?: string;
  @IsOptional() @IsString() physicianLicenseNo?: string;
  @IsOptional() @IsString() physicianPtrNo?: string;
  @IsOptional() @IsString() physicianContact?: string;
  @IsOptional() @IsObject() requiredImmunizations?: Record<string, boolean>;
}
