import { PatientType, Sex } from '@prisma/client';
import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Matches } from 'class-validator';

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
