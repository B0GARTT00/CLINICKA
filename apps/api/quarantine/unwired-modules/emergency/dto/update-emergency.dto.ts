import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmergencyDto {
  @ApiPropertyOptional({
    description: 'Updated priority level',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'CRITICAL',
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priorityLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiPropertyOptional({
    description: 'Updated status',
    enum: ['PENDING', 'TREATED', 'TRANSFERRED', 'DISCHARGED'],
    example: 'TREATED',
  })
  @IsOptional()
  @IsEnum(['PENDING', 'TREATED', 'TRANSFERRED', 'DISCHARGED'])
  status?: 'PENDING' | 'TREATED' | 'TRANSFERRED' | 'DISCHARGED';

  @ApiPropertyOptional({
    description: 'Updated chief complaint',
    example: 'Pain reduced after medication',
  })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({
    description: 'Updated treatment',
    example: 'Observation ongoing',
  })
  @IsOptional()
  @IsString()
  treatment?: string;

  @ApiPropertyOptional({
    description: 'Updated attendance date and time (ISO date string)',
    example: '2024-12-01T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  attendedAt?: string;

  @ApiPropertyOptional({
    description: 'Updated discharge date and time (ISO date string)',
    example: '2024-12-01T14:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dischargedAt?: string;
}
