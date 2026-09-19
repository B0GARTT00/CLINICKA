import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVaccinationDto {
  @ApiProperty({
    description: 'Patient ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  patientId!: string;

  @ApiProperty({
    description: 'Name of the vaccine administered',
    example: 'COVID-19 Vaccine',
  })
  @IsString()
  vaccineName!: string;

  @ApiProperty({
    description: 'Dose number in the vaccination series',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  doseNumber!: number;

  @ApiProperty({
    description: 'Total number of doses in the series',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  totalDoses!: number;

  @ApiProperty({
    description: 'Date and time the vaccine was administered (ISO date string)',
    example: '2024-12-01T09:00:00.000Z',
  })
  @IsDateString()
  administeredAt!: string;

  @ApiPropertyOptional({
    description: 'Date and time of the next scheduled dose (ISO date string)',
    example: '2025-01-01T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  nextDoseAt?: string;

  @ApiPropertyOptional({
    description: 'Name of the person who administered the vaccine',
    example: 'Dr. Smith',
  })
  @IsOptional()
  @IsString()
  administeredBy?: string;
}
