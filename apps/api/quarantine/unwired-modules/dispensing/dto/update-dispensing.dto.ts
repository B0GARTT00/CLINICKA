import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDispensingDto {
  @ApiPropertyOptional({
    description: 'Updated name of the dispenser',
    example: 'Nurse Garcia',
  })
  @IsOptional()
  @IsString()
  dispensedBy?: string;

  @ApiPropertyOptional({
    description: 'Updated dispensing notes',
    example: 'Corrected quantity',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
