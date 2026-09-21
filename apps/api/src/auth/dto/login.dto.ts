import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Registered user email address',
    example: 'admin@bchealth.local',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Account password (minimum 8 characters)',
    example: 'ExamplePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
