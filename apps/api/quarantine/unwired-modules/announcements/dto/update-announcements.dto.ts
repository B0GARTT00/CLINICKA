import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAnnouncementDto {
  @ApiPropertyOptional({
    description: 'Updated announcement title',
    example: 'Updated Flu Vaccination Drive Schedule',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated announcement content',
    example: 'The vaccination drive has been moved to December 12.',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Updated publication status',
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    example: 'PUBLISHED',
  })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}
