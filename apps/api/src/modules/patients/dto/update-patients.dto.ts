import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePatientDto {
  @ApiPropertyOptional({
    description: 'Type of patient',
    enum: ['STUDENT', 'FACULTY', 'STAFF'],
    example: 'STUDENT',
  })
  @IsOptional()
  @IsEnum(['STUDENT', 'FACULTY', 'STAFF'])
  type?: 'STUDENT' | 'FACULTY' | 'STAFF';

  @ApiPropertyOptional({
    description: 'Updated first name',
    example: 'John',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Updated last name',
    example: 'Doe',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Updated email address',
    example: 'john.doe@bchealth.local',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Updated middle name',
    example: 'A.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiPropertyOptional({
    description: 'Updated name suffix',
    example: 'Jr.',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  suffix?: string;

  @ApiPropertyOptional({
    description: 'Updated contact phone number',
    example: '+639171234567',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Updated residential address',
    example: '123 Main St, Quezon City',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Updated biological sex',
    example: 'Male',
  })
  @IsOptional()
  @IsString()
  sex?: string;

  @ApiPropertyOptional({
    description: 'Updated date of birth (ISO date string)',
    example: '2001-05-15',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
