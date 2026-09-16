import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScreeningDto {
  @ApiProperty({
    description: 'Patient ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  patientId!: string;

  @ApiProperty({
    description: 'Type of screening performed',
    example: 'Blood Pressure Screening',
  })
  @IsString()
  screeningType!: string;

  @ApiPropertyOptional({
    description: 'Screening result or findings',
    example: 'Normal range',
  })
  @IsOptional()
  @IsString()
  result?: string;

  @ApiProperty({
    description: 'Current screening status',
    enum: ['PENDING', 'COMPLETED', 'FOLLOW_UP_REQUIRED'],
    example: 'COMPLETED',
  })
  @IsEnum(['PENDING', 'COMPLETED', 'FOLLOW_UP_REQUIRED'])
  status!: 'PENDING' | 'COMPLETED' | 'FOLLOW_UP_REQUIRED';

  @ApiProperty({
    description: 'Date and time the screening was performed (ISO date string)',
    example: '2024-12-01T08:00:00.000Z',
  })
  @IsDateString()
  screenedAt!: string;

  @ApiPropertyOptional({
    description: 'Name of the person who conducted the screening',
    example: 'Nurse Reyes',
  })
  @IsOptional()
  @IsString()
  screenedBy?: string;

  @ApiPropertyOptional({
    description: 'Additional screening notes',
    example: 'No abnormalities detected',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
