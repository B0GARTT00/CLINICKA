import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateConsultationDto,
  CreateVisitDto,
  CreateVitalSignDto,
  UpdateVisitStatusDto,
} from './dto';
import { VisitsService } from './visits.service';


@ApiTags('clinic-visits')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('clinic-visits')
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}

  @Get('queue')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.DOCTOR, UserRole.CLINIC_STAFF)
  @Permissions(Permission.VISITS_READ)
  @ApiOperation({
    summary: 'Get today\'s clinic queue',
    description: 'Retrieves the list of open and in-consultation visits for today, ordered by queue number. Requires visits.read permission.',
  })
  @ApiResponse({ status: 200, description: 'Clinic queue retrieved successfully.', isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  listQueue() {
    return this.visits.listQueue();
  }

  @Get(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.DOCTOR, UserRole.CLINIC_STAFF)
  @Permissions(Permission.VISITS_READ)
  @ApiOperation({
    summary: 'Get clinic visit by ID',
    description: 'Retrieves a single clinic visit record by its unique ID, including vitals, consultations, and dispensations. Requires visits.read permission.',
  })
  @ApiParam({ name: 'id', description: 'Clinic visit ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Clinic visit retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Clinic visit not found.' })
  findOne(@Param('id') id: string) {
    return this.visits.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF)
  @Permissions(Permission.VISITS_MANAGE)
  @ApiOperation({
    summary: 'Create a new clinic visit',
    description: 'Creates a new clinic visit record with a generated queue number. Requires visits.manage permission.',
  })
  @ApiBody({ type: CreateVisitDto })
  @ApiResponse({ status: 201, description: 'Clinic visit created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateVisitDto, @Req() request: AuthenticatedRequest) {
    return this.visits.create(dto, request.user.id);
  }

  @Post(':id/vital-signs')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE)
  @Permissions(Permission.VISITS_MANAGE)
  @ApiOperation({
    summary: 'Record vital signs',
    description: 'Records vital signs for a clinic visit. Requires visits.manage permission.',
  })
  @ApiParam({ name: 'id', description: 'Clinic visit ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: CreateVitalSignDto })
  @ApiResponse({ status: 201, description: 'Vital signs recorded successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Clinic visit not found.' })
  addVitalSigns(@Param('id') id: string, @Body() dto: CreateVitalSignDto, @Req() request: AuthenticatedRequest) {
    return this.visits.addVitalSigns(id, dto, request.user.id);
  }

  @Post(':id/consultation')
  @Roles(UserRole.ADMINISTRATOR, UserRole.DOCTOR, UserRole.CLINIC_NURSE)
  @Permissions(Permission.VISITS_MANAGE)
  @ApiOperation({
    summary: 'Add consultation',
    description: 'Adds a consultation record with diagnoses, treatments, and prescriptions to a clinic visit. Requires visits.manage permission.',
  })
  @ApiParam({ name: 'id', description: 'Clinic visit ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: CreateConsultationDto })
  @ApiResponse({ status: 201, description: 'Consultation added successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Clinic visit not found.' })
  addConsultation(@Param('id') id: string, @Body() dto: CreateConsultationDto, @Req() request: AuthenticatedRequest) {
    return this.visits.addConsultation(id, dto, request.user.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.DOCTOR)
  @Permissions(Permission.VISITS_MANAGE)
  @ApiOperation({
    summary: 'Update visit status',
    description: 'Updates the status of a clinic visit with validated transitions: OPEN -> IN_CONSULTATION -> COMPLETED, or any active status -> CANCELLED. Requires visits.manage permission.',
  })
  @ApiParam({ name: 'id', description: 'Clinic visit ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdateVisitStatusDto })
  @ApiResponse({ status: 200, description: 'Visit status updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid status transition.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Clinic visit not found.' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateVisitStatusDto, @Req() request: AuthenticatedRequest) {
    return this.visits.updateStatus(id, dto.status, request.user.id);
  }

  @Post(':id/complete')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.DOCTOR)
  @Permissions(Permission.VISITS_MANAGE)
  @ApiOperation({
    summary: 'Complete visit',
    description: 'Marks a clinic visit as completed. Requires visits.manage permission.',
  })
  @ApiParam({ name: 'id', description: 'Clinic visit ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Visit completed successfully.' })
  @ApiResponse({ status: 409, description: 'Visit cannot be completed.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Clinic visit not found.' })
  complete(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.visits.complete(id, request.user.id);
  }
}
