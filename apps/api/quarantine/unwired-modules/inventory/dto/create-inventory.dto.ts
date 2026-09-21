import { IsInt, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiProperty({
    description: 'Name of the inventory item',
    example: 'Paracetamol 500mg',
  })
  @IsString()
  itemName!: string;

  @ApiProperty({
    description: 'Item category',
    example: 'Medication',
  })
  @IsString()
  category!: string;

  @ApiProperty({
    description: 'Current quantity in stock',
    example: 100,
    minimum: 0,
  })
  @IsInt()
  quantity!: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'tablets',
  })
  @IsString()
  unit!: string;

  @ApiProperty({
    description: 'Minimum stock level before reorder is needed',
    example: 20,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  reorderLevel!: number;
}
