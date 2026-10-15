import { AppointmentPriority, AppointmentStatus, AppointmentType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min, Matches, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAppointmentDto {
  @IsString()
  patientId!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(240)
  durationMins?: number;

  @IsString()
  purpose!: string;

  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;

  @IsOptional()
  @IsEnum(AppointmentPriority)
  priority?: AppointmentPriority;

  @IsString()
  @MinLength(1)
  assignedToId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;
}

export class RescheduleAppointmentDto {
  @IsOptional() @IsString() @MinLength(1) assignedToId?: string;
  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(240)
  durationMins?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class DoctorAvailabilityQueryDto {
  @IsString() @MinLength(1) doctorId!: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) from!: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) to!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(240) durationMins?: number;
  @IsOptional() @IsString() patientId?: string;
}

export class CreateDoctorAvailabilityDto {
  @IsString() @MinLength(1) doctorId!: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
}

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
