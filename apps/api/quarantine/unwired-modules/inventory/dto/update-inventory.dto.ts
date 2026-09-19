import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInventoryDto {
  @ApiPropertyOptional({
    description: 'Updated item name',
    example: 'Paracetamol 500mg',
  })
  @IsOptional()
  @IsString()
  itemName?: string;

  @ApiPropertyOptional({
    description: 'Updated item category',
    example: 'Medication',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Updated quantity in stock',
    example: 150,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Updated unit of measurement',
    example: 'tablets',
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    description: 'Updated reorder level',
    example: 25,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;
}
