import { IsDateString, IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClinicVisitDto {
  @ApiPropertyOptional({
    description: 'Updated type of clinic visit',
    example: 'Follow-up',
  })
  @IsOptional()
  @IsString()
  visitType?: string;

  @ApiPropertyOptional({
    description: 'Updated visit status',
    example: 'COMPLETED',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Updated reason for the visit',
    example: 'Follow-up for fever',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Updated additional notes',
    example: 'Patient recovering well',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Updated visit date and time (ISO date string)',
    example: '2024-12-01T09:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  visitedAt?: string;
}
