import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateEmergencyCaseDto } from './dto';
import { EmergenciesService } from './emergencies.service';


/** Emergency cases are restricted to clinical responders. */
const EMERGENCY_ROLES = [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.DOCTOR] as const;

@ApiTags('emergencies')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('emergencies')
export class EmergenciesController {
  constructor(private readonly emergencies: EmergenciesService) {}

  @Get()
  @Roles(...EMERGENCY_ROLES)
  @Permissions(Permission.EMERGENCIES_READ)
  @ApiOperation({ summary: 'List emergency cases', description: 'Requires emergencies.read permission.' })
  @ApiResponse({ status: 200, description: 'Emergency cases retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  list() {
    return this.emergencies.list();
  }

  @Post()
  @Roles(...EMERGENCY_ROLES)
  @Permissions(Permission.EMERGENCIES_MANAGE)
  @ApiOperation({ summary: 'Record an emergency case', description: 'Requires emergencies.manage permission.' })
  @ApiResponse({ status: 201, description: 'Emergency case recorded.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateEmergencyCaseDto, @Req() request: AuthenticatedRequest) {
    return this.emergencies.create(dto, request.user.id);
  }
}
