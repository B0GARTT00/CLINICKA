import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCertificateDto {
  @ApiProperty({
    description: 'Patient ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  patientId!: string;

  @ApiProperty({
    description: 'Type of certificate',
    example: 'Medical Clearance',
  })
  @IsString()
  certificateType!: string;

  @ApiPropertyOptional({
    description: 'Purpose of the certificate',
    example: 'For off-campus activity',
  })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiProperty({
    description: 'Current certificate status',
    enum: ['PENDING', 'ISSUED', 'VERIFIED', 'EXPIRED'],
    example: 'PENDING',
  })
  @IsEnum(['PENDING', 'ISSUED', 'VERIFIED', 'EXPIRED'])
  status!: 'PENDING' | 'ISSUED' | 'VERIFIED' | 'EXPIRED';

  @ApiPropertyOptional({
    description: 'Date and time the certificate was issued (ISO date string)',
    example: '2024-12-01T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiPropertyOptional({
    description: 'Date and time the certificate expires (ISO date string)',
    example: '2025-12-01T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({
    description: 'Name of the person who issued the certificate',
    example: 'Dr. Santos',
  })
  @IsOptional()
  @IsString()
  issuedBy?: string;

  @ApiPropertyOptional({
    description: 'Certificate verification code',
    example: 'BC-2024-001234',
  })
  @IsOptional()
  @IsString()
  verificationCode?: string;
}
