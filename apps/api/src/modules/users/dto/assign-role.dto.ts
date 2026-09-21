import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({
    description: 'Role name to assign to the user',
    example: 'CLINIC_NURSE',
  })
  @IsString()
  role!: string;
}
