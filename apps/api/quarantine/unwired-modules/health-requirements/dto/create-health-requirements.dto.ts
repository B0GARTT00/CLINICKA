import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHealthRequirementDto {
  @ApiProperty({
    description: 'Patient ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  patientId!: string;

  @ApiProperty({
    description: 'Type of health requirement',
    example: 'Medical Clearance',
  })
  @IsString()
  requirementType!: string;

  @ApiPropertyOptional({
    description: 'Additional description',
    example: 'Required for physical education class',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Current status of the requirement',
    enum: ['PENDING', 'SUBMITTED', 'VERIFIED', 'MISSING'],
    example: 'PENDING',
  })
  @IsEnum(['PENDING', 'SUBMITTED', 'VERIFIED', 'MISSING'])
  status!: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'MISSING';

  @ApiPropertyOptional({
    description: 'Date and time the requirement was submitted (ISO date string)',
    example: '2024-12-01T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  @ApiPropertyOptional({
    description: 'Date and time the requirement was verified (ISO date string)',
    example: '2024-12-02T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  verifiedAt?: string;
}
