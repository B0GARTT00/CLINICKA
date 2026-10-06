import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { DentalService } from './dental.service';
import { CreateDentalRecordDto } from './dto';

const CLINICAL_ROLES = [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF, UserRole.DOCTOR] as const;

@ApiTags('dental-records')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('dental-records')
export class DentalController {
  constructor(private readonly dental: DentalService) {}

  @Get()
  @Roles(...CLINICAL_ROLES)
  @Permissions(Permission.CLINICAL_READ)
  @ApiOperation({ summary: 'List dental examinations' })
  list() { return this.dental.list(); }

  @Post()
  @Roles(...CLINICAL_ROLES)
  @Permissions(Permission.CLINICAL_MANAGE)
  @ApiOperation({ summary: 'Record a dental examination' })
  create(@Body() dto: CreateDentalRecordDto, @Req() request: AuthenticatedRequest) {
    return this.dental.create(dto, request.user.id);
  }
}
