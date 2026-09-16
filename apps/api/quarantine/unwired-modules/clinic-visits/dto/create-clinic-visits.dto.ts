import { IsDateString, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClinicVisitDto {
  @ApiProperty({
    description: 'Patient ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  patientId!: string;

  @ApiProperty({
    description: 'Type of clinic visit',
    example: 'Consultation',
  })
  @IsString()
  visitType!: string;

  @ApiProperty({
    description: 'Visit status',
    example: 'COMPLETED',
  })
  @IsString()
  status!: string;

  @ApiPropertyOptional({
    description: 'Reason for the visit',
    example: 'Fever and cough',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the visit',
    example: 'Prescribed paracetamol',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Date and time of the visit (ISO date string)',
    example: '2024-12-01T09:30:00.000Z',
  })
  @IsDateString()
  visitedAt!: string;
}
