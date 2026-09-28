import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam, ApiResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateDispensationDto } from './dto';
import { DispensingService } from './dispensing.service';


/** Reconciliation exposes discrepancy detail, so it excludes front-desk roles. */
const RECONCILER_ROLES = [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.DOCTOR] as const;

@ApiTags('medicine-dispensing')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('inventory/dispensing')
export class DispensingController {
  constructor(private readonly dispensing: DispensingService) {}

  @Get()
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF, UserRole.DOCTOR)
  @Permissions(Permission.DISPENSING_READ)
  @ApiOperation({ summary: 'List medicine dispensations', description: 'Requires dispensing.read permission.' })
  @ApiResponse({ status: 200, description: 'Dispensations retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  list() {
    return this.dispensing.list();
  }

  @Get('exceptions')
  @Roles(...RECONCILER_ROLES)
  @Permissions(Permission.DISPENSING_RECONCILE)
  @ApiOperation({ summary: 'Read the dispensing exception report', description: 'Requires dispensing.reconcile permission.' })
  @ApiResponse({ status: 200, description: 'Exception report retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  exceptionReport() {
    return this.dispensing.getExceptionReport();
  }

  @Get('visits/:clinicVisitId/reconciliation')
  @Roles(...RECONCILER_ROLES)
  @Permissions(Permission.DISPENSING_RECONCILE)
  @ApiOperation({ summary: 'Reconcile a visit against its dispensations', description: 'Requires dispensing.reconcile permission.' })
  @ApiParam({ name: 'clinicVisitId', description: 'Clinic visit ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Reconciliation retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  visitReconciliation(@Param('clinicVisitId') clinicVisitId: string) {
    return this.dispensing.getVisitReconciliation(clinicVisitId);
  }

  @Post()
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE)
  @Permissions(Permission.DISPENSING_MANAGE)
  @ApiOperation({ summary: 'Record a medicine dispensation', description: 'Requires dispensing.manage permission.' })
  @ApiResponse({ status: 201, description: 'Dispensation recorded.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateDispensationDto, @Req() request: AuthenticatedRequest) {
    return this.dispensing.create(dto, request.user.id);
  }
}
