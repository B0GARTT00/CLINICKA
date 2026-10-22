import { PatientType } from '@prisma/client';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Min, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class SignupDto {
  @IsEmail()
  @Matches(/^[^@\s]+@brokenshire\.edu\.ph$/i, { message: 'Email must use the @brokenshire.edu.ph domain.' })
  email!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsOptional()
  @IsEnum(PatientType)
  patientType?: PatientType;

  @IsOptional() @IsString() studentId?: string;
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() programId?: string;
  @IsOptional() @IsInt() @Min(1) yearLevel?: number;
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsUUID('4') verificationSessionId?: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @IsString()
  refreshToken!: string;
}

export class AccountEmailDto {
  @IsEmail()
  @Matches(/^[^@\s]+@brokenshire\.edu\.ph$/i, { message: 'Email must use the @brokenshire.edu.ph domain.' })
  email!: string;
}

export class UpdateOwnProfileDto {
  @IsString()
  @MinLength(2)
  displayName!: string;
}

export class RedeemClinicianTicketDto {
  @IsString()
  ticket!: string;

  @IsEmail()
  clinicianEmail!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class CompleteClinicianInvitationDto {
  @IsString()
  @Matches(/^[0-9a-f-]{36}$/i, { message: 'Invitation token is invalid.' })
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class CreateClinicianInvitationDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsString()
  @Matches(/^(DOCTOR|DENTIST)$/)
  role!: 'DOCTOR' | 'DENTIST';
}

export class CompletePasswordResetDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/, { message: 'Reset token is invalid.' })
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
