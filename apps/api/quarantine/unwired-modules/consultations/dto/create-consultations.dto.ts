import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConsultationDto {
  @ApiProperty({
    description: 'Patient ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  patientId!: string;

  @ApiPropertyOptional({
    description: 'Related clinic visit ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  clinicVisitId?: string;

  @ApiPropertyOptional({
    description: 'Reported symptoms',
    example: 'Fever, cough, sore throat',
  })
  @IsOptional()
  @IsString()
  symptoms?: string;

  @ApiPropertyOptional({
    description: 'Clinical findings',
    example: 'Temperature 38.5C, throat redness',
  })
  @IsOptional()
  @IsString()
  findings?: string;

  @ApiPropertyOptional({
    description: 'Clinical diagnosis',
    example: 'Upper respiratory tract infection',
  })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({
    description: 'Prescribed treatment',
    example: 'Paracetamol 500mg every 6 hours for 3 days',
  })
  @IsOptional()
  @IsString()
  treatment?: string;

  @ApiPropertyOptional({
    description: 'Additional clinical notes',
    example: 'Follow-up in 3 days if symptoms persist',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Date and time of consultation (ISO date string)',
    example: '2024-12-01T10:00:00.000Z',
  })
  @IsDateString()
  consultedAt!: string;
}
