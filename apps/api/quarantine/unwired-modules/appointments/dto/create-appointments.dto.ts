import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'Patient ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  patientId!: string;

  @ApiProperty({
    description: 'Appointment date and time (ISO date string)',
    example: '2024-12-01T09:00:00.000Z',
  })
  @IsDateString()
  appointmentDate!: string;

  @ApiPropertyOptional({
    description: 'Reason for the appointment',
    example: 'Routine check-up',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    description: 'Current appointment status',
    enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'],
    example: 'SCHEDULED',
  })
  @IsEnum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'])
  status!: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';

  @ApiPropertyOptional({
    description: 'Additional notes about the appointment',
    example: 'Bring previous lab results',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
