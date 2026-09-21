import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDispensingDto {
  @ApiProperty({
    description: 'Patient ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  patientId!: string;

  @ApiProperty({
    description: 'Inventory item ID being dispensed',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  inventoryItemId!: string;

  @ApiProperty({
    description: 'Quantity dispensed',
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    description: 'Date and time the item was dispensed (ISO date string)',
    example: '2024-12-01T09:00:00.000Z',
  })
  @IsDateString()
  dispensedAt!: string;

  @ApiPropertyOptional({
    description: 'Name of the person who dispensed the item',
    example: 'Nurse Garcia',
  })
  @IsOptional()
  @IsString()
  dispensedBy?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the dispensing',
    example: 'Part of monthly refill',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
