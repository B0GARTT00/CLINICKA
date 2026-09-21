import { IsDateString, IsString } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  label!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}

export class CreateSemesterDto {
  @IsString()
  academicYearId!: string;

  @IsString()
  term!: string;

  @IsString()
  label!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}
