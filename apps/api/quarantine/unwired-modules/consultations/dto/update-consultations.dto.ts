import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConsultationDto {
  @ApiPropertyOptional({
    description: 'Updated reported symptoms',
    example: 'Fever, cough',
  })
  @IsOptional()
  @IsString()
  symptoms?: string;

  @ApiPropertyOptional({
    description: 'Updated clinical findings',
    example: 'Temperature 38.2C',
  })
  @IsOptional()
  @IsString()
  findings?: string;

  @ApiPropertyOptional({
    description: 'Updated diagnosis',
    example: 'Viral infection',
  })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({
    description: 'Updated treatment',
    example: 'Rest and hydration',
  })
  @IsOptional()
  @IsString()
  treatment?: string;

  @ApiPropertyOptional({
    description: 'Updated additional notes',
    example: 'Patient improving',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Updated consultation date and time (ISO date string)',
    example: '2024-12-01T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  consultedAt?: string;
}
