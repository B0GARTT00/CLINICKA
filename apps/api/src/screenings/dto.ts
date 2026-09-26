import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVaccinationDto {
  @IsString()
  patientId!: string;

  @IsString()
  vaccineName!: string;

  @IsString()
  dose!: string;

  @IsDateString()
  receivedAt!: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsString()
  @IsNotEmpty()
  sourceProvider!: string;
}

export class CreateScreeningDto {
  @IsString()
  patientId!: string;

  @IsString()
  screeningType!: string;

  @IsDateString()
  screenedAt!: string;

  @IsString()
  result!: string;

  @IsOptional()
  @IsString()
  findings?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;
}
