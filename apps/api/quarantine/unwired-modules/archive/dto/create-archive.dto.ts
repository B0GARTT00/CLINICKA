import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArchiveDto {
  @ApiProperty({
    description: 'Type of record being archived',
    example: 'Patient',
  })
  @IsString()
  recordType!: string;

  @ApiProperty({
    description: 'ID of the record being archived',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  recordId!: string;

  @ApiProperty({
    description: 'Serialized record data to archive',
    example: '{"id":"123e4567-e89b-12d3-a456-426614174000","firstName":"John","lastName":"Doe"}',
  })
  @IsString()
  data!: string;

  @ApiPropertyOptional({
    description: 'Name of the user who archived the record',
    example: 'Admin User',
  })
  @IsOptional()
  @IsString()
  archivedBy?: string;

  @ApiPropertyOptional({
    description: 'Reason for archiving the record',
    example: 'Record retention policy compliance',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
