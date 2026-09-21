import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClearanceDto {
  @ApiProperty({
    description: 'Patient ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  patientId!: string;

  @ApiProperty({
    description: 'Type of clearance requested',
    example: 'Medical Clearance',
  })
  @IsString()
  clearanceType!: string;

  @ApiPropertyOptional({
    description: 'Reason for requesting the clearance',
    example: 'Required for off-campus activity',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    description: 'Current clearance status',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    example: 'PENDING',
  })
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED'])
  status!: 'PENDING' | 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({
    description: 'Additional notes about the clearance',
    example: 'Student meets all health requirements',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
