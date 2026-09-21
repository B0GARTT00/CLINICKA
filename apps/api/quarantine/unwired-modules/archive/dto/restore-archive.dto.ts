import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RestoreArchiveDto {
  @ApiPropertyOptional({
    description: 'Name of the user restoring the archived record',
    example: 'Admin User',
  })
  @IsOptional()
  @IsString()
  restoredBy?: string;
}
