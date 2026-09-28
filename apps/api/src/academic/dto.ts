import { SemesterTerm } from '@prisma/client';
import { IsDateString, IsEnum, IsString } from 'class-validator';

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

  @IsEnum(SemesterTerm)
  term!: SemesterTerm;

  @IsString()
  label!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}
