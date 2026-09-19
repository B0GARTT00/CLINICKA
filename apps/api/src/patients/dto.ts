import { PatientType, Sex } from '@prisma/client';
import { IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class CreatePatientDto {
  @IsEnum(PatientType)
  type!: PatientType;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsEmail()
  @Matches(/^[^@\s]+@brokenshire\.edu\.ph$/i, { message: 'Email must use the @brokenshire.edu.ph domain.' })
  email?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  suffix?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @IsOptional()
  @IsInt()
  yearLevel?: number;

  @IsOptional()
  @IsString()
  program?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class UpdatePatientDto {
  @IsOptional()
  @IsEnum(PatientType)
  type?: PatientType;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @Matches(/^[^@\s]+@brokenshire\.edu\.ph$/i, { message: 'Email must use the @brokenshire.edu.ph domain.' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @IsOptional()
  @IsInt()
  yearLevel?: number;

  @IsOptional()
  @IsString()
  program?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class CreateEmergencyContactDto {
  @IsString()
  name!: string;

  @IsString()
  relationship!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class CreateMedicalHistoryDto {
  @IsString()
  summary!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMedicalConditionDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsDateString()
  diagnosedAt?: string;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAllergyDto {
  @IsString()
  allergen!: string;

  @IsOptional()
  @IsString()
  reaction?: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePatientHealthRecordDto {
  @IsOptional() @IsString() guardianName?: string;
  @IsOptional() @IsString() spouseName?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() doctorOfChoice?: string;
  @IsOptional() @IsString() hospitalOfChoice?: string;
  @IsOptional() @IsString() presentHistory?: string;
  @IsOptional() @IsString() reviewOfSystems?: string;
  @IsOptional() @IsObject() pastMedicalHistory?: Record<string, unknown>;
  @IsOptional() @IsObject() obGyneHistory?: Record<string, unknown>;
  @IsOptional() @IsObject() familyHistory?: Record<string, unknown>;
  @IsOptional() @IsObject() psychosocialHistory?: Record<string, unknown>;
  @IsOptional() @IsObject() physicalExamination?: Record<string, unknown>;
  @IsOptional() @IsObject() laboratoryExaminations?: Record<string, unknown>;
}

export class CreateDocumentDto {
  @IsString()
  filename!: string;

  @IsString()
  mimeType!: string;

  @IsString()
  storageKey!: string;

  @IsInt()
  sizeBytes!: number;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
