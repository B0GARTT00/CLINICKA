import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePatientDto {
  @ApiProperty({
    description: 'Unique patient identifier number',
    example: '2024-0001',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @Length(1, 50)
  patientNumber!: string;

  @ApiProperty({
    description: 'Type of patient',
    enum: ['STUDENT', 'FACULTY', 'STAFF'],
    example: 'STUDENT',
  })
  @IsEnum(['STUDENT', 'FACULTY', 'STAFF'])
  type!: 'STUDENT' | 'FACULTY' | 'STAFF';

  @ApiProperty({
    description: 'Patient first name',
    example: 'John',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  firstName!: string;

  @ApiProperty({
    description: 'Patient last name',
    example: 'Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  lastName!: string;

  @ApiProperty({
    description: 'Patient email address',
    example: 'john.doe@bchealth.local',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Patient middle name',
    example: 'A.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiPropertyOptional({
    description: 'Name suffix (Jr., Sr., etc.)',
    example: 'Jr.',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  suffix?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+639171234567',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Residential address',
    example: '123 Main St, Quezon City',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Biological sex',
    example: 'Male',
  })
  @IsOptional()
  @IsString()
  sex?: string;

  @ApiPropertyOptional({
    description: 'Date of birth (ISO date string)',
    example: '2001-05-15',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
