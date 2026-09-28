import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateClearanceDto, ReviewClearanceDto } from './dto';
import { ClearancesService } from './clearances.service';


const CLEARANCE_ROLES = [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF] as const;
const CLEARANCE_READ_ROLES = [...CLEARANCE_ROLES, UserRole.DOCTOR] as const;

@ApiTags('clearances')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('clearances')
export class ClearancesController {
  constructor(private readonly clearances: ClearancesService) {}

  @Get()
  @Roles(...CLEARANCE_READ_ROLES)
  @Permissions(Permission.CLEARANCES_READ)
  @ApiOperation({ summary: 'List clearances', description: 'Requires clearances.read permission.' })
  @ApiResponse({ status: 200, description: 'Clearances retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  list() {
    return this.clearances.list();
  }

  @Get('eligibility/:patientId')
  @Roles(...CLEARANCE_ROLES)
  @Permissions(Permission.CLEARANCES_READ)
  @ApiOperation({
    summary: 'Check clearance eligibility',
    description: 'Evaluates whether a patient meets the outstanding requirements for an academic year and semester. Requires clearances.read permission.',
  })
  @ApiResponse({ status: 200, description: 'Eligibility evaluated.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  eligibility(@Param('patientId') patientId: string, @Query('academicYearId') academicYearId?: string, @Query('semesterId') semesterId?: string) {
    return this.clearances.eligibility(patientId, academicYearId, semesterId);
  }

  @Post()
  @Roles(...CLEARANCE_ROLES)
  @Permissions(Permission.CLEARANCES_MANAGE)
  @ApiOperation({ summary: 'Create a clearance', description: 'Requires clearances.manage permission.' })
  @ApiResponse({ status: 201, description: 'Clearance created.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateClearanceDto, @Req() request: AuthenticatedRequest) {
    return this.clearances.create(dto, request.user.id);
  }

  @Post(':id/review')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE)
  @Permissions(Permission.CLEARANCES_REVIEW)
  @ApiOperation({
    summary: 'Review a clearance',
    description: 'Approves or rejects a pending clearance. Restricted to reviewing roles and requires clearances.review permission.',
  })
  @ApiResponse({ status: 201, description: 'Clearance reviewed.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  review(@Param('id') id: string, @Body() dto: ReviewClearanceDto, @Req() request: AuthenticatedRequest) {
    return this.clearances.review(id, dto, request.user.id);
  }
}
