import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateScreeningDto {
  @ApiPropertyOptional({
    description: 'Updated screening type',
    example: 'Vision Screening',
  })
  @IsOptional()
  @IsString()
  screeningType?: string;

  @ApiPropertyOptional({
    description: 'Updated screening result',
    example: '20/20 vision',
  })
  @IsOptional()
  @IsString()
  result?: string;

  @ApiPropertyOptional({
    description: 'Updated screening status',
    enum: ['PENDING', 'COMPLETED', 'FOLLOW_UP_REQUIRED'],
    example: 'COMPLETED',
  })
  @IsOptional()
  @IsEnum(['PENDING', 'COMPLETED', 'FOLLOW_UP_REQUIRED'])
  status?: 'PENDING' | 'COMPLETED' | 'FOLLOW_UP_REQUIRED';

  @ApiPropertyOptional({
    description: 'Updated screening date and time (ISO date string)',
    example: '2024-12-01T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  screenedAt?: string;

  @ApiPropertyOptional({
    description: 'Updated name of the screener',
    example: 'Nurse Reyes',
  })
  @IsOptional()
  @IsString()
  screenedBy?: string;

  @ApiPropertyOptional({
    description: 'Updated screening notes',
    example: 'Follow-up in 6 months',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
