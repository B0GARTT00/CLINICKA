import { AppointmentPriority, AppointmentStatus, AppointmentType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;
}

export class RescheduleAppointmentDto {
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

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
