import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateDentalRecordDto {
  @IsString() patientId!: string;
  @IsDateString() examinedAt!: string;
  @IsOptional() @IsString() courseYearSection?: string;
  @IsOptional() @IsObject() toothChart?: Record<string, string>;
  @IsOptional() @IsString() plaqueLevel?: string;
  @IsOptional() @IsBoolean() hasGingivitis?: boolean;
  @IsOptional() @IsBoolean() hasPeriodontitis?: boolean;
  @IsOptional() @IsBoolean() retainerUpper?: boolean;
  @IsOptional() @IsBoolean() retainerLower?: boolean;
  @IsOptional() @IsBoolean() bracesUpper?: boolean;
  @IsOptional() @IsBoolean() bracesLower?: boolean;
  @IsOptional() @IsString() oralCondition?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) fillingCount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) extractionCount?: number;
  @IsOptional() @IsBoolean() needsOralProphylaxis?: boolean;
  @IsOptional() @IsString() recommendation?: string;
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() @IsString() dentistName?: string;
  @IsOptional() @IsDateString() waiverDueAt?: string;
  @IsOptional() @IsDateString() waiverSignedAt?: string;
  @IsOptional() @IsString() waiverSignedBy?: string;
  @IsOptional() @IsObject() formMetadata?: Record<string, unknown>;
}
