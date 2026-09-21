import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVaccinationDto {
  @ApiPropertyOptional({
    description: 'Updated vaccine name',
    example: 'COVID-19 Booster',
  })
  @IsOptional()
  @IsString()
  vaccineName?: string;

  @ApiPropertyOptional({
    description: 'Updated dose number',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  doseNumber?: number;

  @ApiPropertyOptional({
    description: 'Updated total doses in the series',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalDoses?: number;

  @ApiPropertyOptional({
    description: 'Updated administration date and time (ISO date string)',
    example: '2024-12-01T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  administeredAt?: string;

  @ApiPropertyOptional({
    description: 'Updated next dose date and time (ISO date string)',
    example: '2025-01-01T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  nextDoseAt?: string;

  @ApiPropertyOptional({
    description: 'Updated name of the administrator',
    example: 'Dr. Smith',
  })
  @IsOptional()
  @IsString()
  administeredBy?: string;
}
