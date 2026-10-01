import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateClearanceDto, RequestClearanceDto, ReviewClearanceDto } from './dto';
import { ClearancesService } from './clearances.service';


const CLEARANCE_ROLES = [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF] as const;
const CLEARANCE_READ_ROLES = [...CLEARANCE_ROLES, UserRole.DOCTOR] as const;
const SELF_SERVICE_ROLES = [UserRole.STUDENT, UserRole.FACULTY_STAFF] as const;

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

  @Get('mine')
  @Roles(...SELF_SERVICE_ROLES)
  @Permissions(Permission.CLEARANCES_REQUEST)
  @ApiOperation({ summary: 'List my clearance requests', description: 'Returns only clearances linked to the caller\'s patient record.' })
  listMine(@Req() request: AuthenticatedRequest) {
    if (!request.user.patientId) throw new BadRequestException('Your account is not linked to a patient record.');
    return this.clearances.list(request.user.patientId);
  }

  @Get('eligibility/me')
  @Roles(...SELF_SERVICE_ROLES)
  @Permissions(Permission.CLEARANCES_REQUEST)
  @ApiOperation({ summary: 'Check my clearance eligibility' })
  eligibilityMine(@Req() request: AuthenticatedRequest, @Query('academicYearId') academicYearId?: string, @Query('semesterId') semesterId?: string) {
    if (!request.user.patientId) throw new BadRequestException('Your account is not linked to a patient record.');
    return this.clearances.eligibility(request.user.patientId, academicYearId, semesterId);
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

  @Post('request')
  @Roles(...SELF_SERVICE_ROLES)
  @Permissions(Permission.CLEARANCES_REQUEST)
  @ApiOperation({ summary: 'Request my clearance', description: 'Creates a review request for the patient record linked to the caller.' })
  request(@Body() dto: RequestClearanceDto, @Req() request: AuthenticatedRequest) {
    if (!request.user.patientId) throw new BadRequestException('Your account is not linked to a patient record.');
    return this.clearances.request(dto, request.user.patientId, request.user.id);
  }

  @Post(':id/submit')
  @Roles(...SELF_SERVICE_ROLES)
  @Permissions(Permission.CLEARANCES_REQUEST)
  @ApiOperation({ summary: 'Submit a completed clearance draft for clinic review' })
  submitDraft(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    if (!request.user.patientId) throw new BadRequestException('Your account is not linked to a patient record.');
    return this.clearances.submitDraft(id, request.user.patientId, request.user.id);
  }

  @Post(':id/archive')
  @Roles(...CLEARANCE_ROLES)
  @Permissions(Permission.CLEARANCES_MANAGE)
  @ApiOperation({ summary: 'Archive a terminal clearance application without deleting its history' })
  archive(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.clearances.archive(id, request.user.id);
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
