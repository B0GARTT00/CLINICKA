import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmergencyDto {
  @ApiProperty({
    description: 'Patient ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  patientId!: string;

  @ApiProperty({
    description: 'Priority level of the emergency case',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'HIGH',
  })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priorityLevel!: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiProperty({
    description: 'Current status of the emergency case',
    enum: ['PENDING', 'TREATED', 'TRANSFERRED', 'DISCHARGED'],
    example: 'PENDING',
  })
  @IsEnum(['PENDING', 'TREATED', 'TRANSFERRED', 'DISCHARGED'])
  status!: 'PENDING' | 'TREATED' | 'TRANSFERRED' | 'DISCHARGED';

  @ApiPropertyOptional({
    description: 'Chief complaint or presenting problem',
    example: 'Severe abdominal pain',
  })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({
    description: 'Treatment provided',
    example: 'IV fluids, pain management',
  })
  @IsOptional()
  @IsString()
  treatment?: string;

  @ApiPropertyOptional({
    description: 'Date and time the patient was attended (ISO date string)',
    example: '2024-12-01T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  attendedAt?: string;

  @ApiPropertyOptional({
    description: 'Date and time the patient was discharged (ISO date string)',
    example: '2024-12-01T14:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dischargedAt?: string;
}
