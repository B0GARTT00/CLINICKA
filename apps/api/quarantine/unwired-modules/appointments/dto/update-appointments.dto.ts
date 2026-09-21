import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAppointmentDto {
  @ApiPropertyOptional({
    description: 'Updated appointment date and time (ISO date string)',
    example: '2024-12-01T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @ApiPropertyOptional({
    description: 'Updated reason for the appointment',
    example: 'Follow-up check-up',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Updated appointment status',
    enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'],
    example: 'COMPLETED',
  })
  @IsOptional()
  @IsEnum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'])
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';

  @ApiPropertyOptional({
    description: 'Updated additional notes',
    example: 'Patient rescheduled due to conflict',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
