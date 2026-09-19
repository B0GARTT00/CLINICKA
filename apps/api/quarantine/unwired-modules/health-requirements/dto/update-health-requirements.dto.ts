import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateHealthRequirementDto {
  @ApiPropertyOptional({
    description: 'Updated requirement type',
    example: 'Annual Physical Exam',
  })
  @IsOptional()
  @IsString()
  requirementType?: string;

  @ApiPropertyOptional({
    description: 'Updated description',
    example: 'Required for enrollment',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated status',
    enum: ['PENDING', 'SUBMITTED', 'VERIFIED', 'MISSING'],
    example: 'VERIFIED',
  })
  @IsOptional()
  @IsEnum(['PENDING', 'SUBMITTED', 'VERIFIED', 'MISSING'])
  status?: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'MISSING';

  @ApiPropertyOptional({
    description: 'Updated submission date and time (ISO date string)',
    example: '2024-12-01T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  @ApiPropertyOptional({
    description: 'Updated verification date and time (ISO date string)',
    example: '2024-12-02T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  verifiedAt?: string;
}
