import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCertificateDto {
  @ApiPropertyOptional({
    description: 'Updated certificate type',
    example: 'Fitness Clearance',
  })
  @IsOptional()
  @IsString()
  certificateType?: string;

  @ApiPropertyOptional({
    description: 'Updated purpose',
    example: 'For employment',
  })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({
    description: 'Updated certificate status',
    enum: ['PENDING', 'ISSUED', 'VERIFIED', 'EXPIRED'],
    example: 'ISSUED',
  })
  @IsOptional()
  @IsEnum(['PENDING', 'ISSUED', 'VERIFIED', 'EXPIRED'])
  status?: 'PENDING' | 'ISSUED' | 'VERIFIED' | 'EXPIRED';

  @ApiPropertyOptional({
    description: 'Updated issue date and time (ISO date string)',
    example: '2024-12-01T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiPropertyOptional({
    description: 'Updated expiry date and time (ISO date string)',
    example: '2025-12-01T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({
    description: 'Updated name of the issuer',
    example: 'Dr. Santos',
  })
  @IsOptional()
  @IsString()
  issuedBy?: string;

  @ApiPropertyOptional({
    description: 'Updated verification code',
    example: 'BC-2024-001234',
  })
  @IsOptional()
  @IsString()
  verificationCode?: string;
}
