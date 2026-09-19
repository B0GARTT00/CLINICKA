import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClearanceDto {
  @ApiPropertyOptional({
    description: 'Updated clearance type',
    example: 'Fitness Clearance',
  })
  @IsOptional()
  @IsString()
  clearanceType?: string;

  @ApiPropertyOptional({
    description: 'Updated reason',
    example: 'For employment',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Updated clearance status',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    example: 'APPROVED',
  })
  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({
    description: 'Date and time of approval (ISO date string)',
    example: '2024-12-02T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  approvedAt?: string;

  @ApiPropertyOptional({
    description: 'Date and time of rejection (ISO date string)',
    example: '2024-12-02T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  rejectedAt?: string;

  @ApiPropertyOptional({
    description: 'Updated additional notes',
    example: 'Cleared for sports',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
