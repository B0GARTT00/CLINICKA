import { CertificateType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

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
  @IsOptional() @IsInt() @Min(0) lateMinutes?: number;
  @IsOptional() @IsString() lateReason?: string;
  @IsOptional() @IsString() specialCare?: string;
  @IsOptional() @IsObject() healthCounselling?: Record<string, unknown>;
  @IsOptional() @IsObject() patientAcknowledgment?: Record<string, unknown>;
  @IsOptional() @IsDateString() physicianSignedAt?: string;
  @IsOptional() @IsObject() formMetadata?: Record<string, unknown>;
}
