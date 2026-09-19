import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty({
    description: 'Announcement title',
    example: 'Flu Vaccination Drive',
  })
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'Full announcement content',
    example: 'A free flu vaccination drive will be held on December 10 at the clinic.',
  })
  @IsString()
  content!: string;

  @ApiProperty({
    description: 'Publication status',
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    example: 'PUBLISHED',
  })
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status!: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}
