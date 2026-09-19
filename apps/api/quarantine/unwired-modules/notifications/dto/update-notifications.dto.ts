import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationDto {
  @ApiPropertyOptional({
    description: 'Updated read status of the notification',
    example: 'true',
  })
  @IsOptional()
  @IsString()
  isRead?: string;
}
