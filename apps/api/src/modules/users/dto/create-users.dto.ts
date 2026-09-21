import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../auth/constants/roles';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@bchealth.local',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Account password (minimum 8 characters)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    description: 'Full name to display in the system',
    example: 'Jane Doe',
  })
  @IsString()
  displayName!: string;

  @ApiProperty({
    description: 'System role assigned to the user',
    enum: UserRole,
    example: UserRole.CLINIC_NURSE,
  })
  @IsEnum(UserRole)
  role!: UserRole;
}
