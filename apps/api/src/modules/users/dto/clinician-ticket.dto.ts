import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../../auth/constants/roles';

export class CreateClinicianTicketDto {
  @IsString()
  @MinLength(2)
  clinicianName!: string;

  @IsEmail()
  clinicianEmail!: string;

  @IsEnum(UserRole)
  role!: UserRole.DOCTOR | UserRole.DENTIST;
}

export class RedeemClinicianTicketDto {
  @IsString()
  ticket!: string;

  @IsEmail()
  clinicianEmail!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
