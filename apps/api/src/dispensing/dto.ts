import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class DispensationItemDto {
  @IsString()
  medicineBatchId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreateDispensationDto {
  @IsString()
  patientId!: string;

  @IsString()
  @IsNotEmpty()
  clinicVisitId!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DispensationItemDto)
  items!: DispensationItemDto[];
}
