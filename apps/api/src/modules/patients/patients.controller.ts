import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { PatientType } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../../auth/constants/api-security';
import { Permission } from '../../auth/constants/permissions';
import { UserRole } from '../../auth/constants/roles';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateDocumentDto, CreatePatientDto, UpdatePatientDto, UpdatePatientHealthRecordDto } from './dto';
import { PatientsService } from './patients.service';


@ApiTags('patients')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get('me')
  @Roles(UserRole.STUDENT, UserRole.FACULTY_STAFF)
  @Permissions(Permission.OWN_PROFILE_READ)
  @ApiOperation({ summary: 'Get the caller\'s own patient profile', description: 'Returns only the patient record linked to the authenticated account.' })
  @ApiResponse({ status: 200, description: 'Own patient profile retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'No patient record is linked to this account.' })
  ownProfile(@Req() request: AuthenticatedRequest) {
    return this.patients.findOwn(request.user.id);
  }

  @Get()
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.DOCTOR, UserRole.CLINIC_STAFF)
  @Permissions(Permission.PATIENTS_READ)
  @ApiOperation({
    summary: 'List patients',
    description: 'Retrieves a paginated list of patients. Supports optional search filtering. Requires patients.read permission.',
  })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'Doe' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'type', required: false, enum: PatientType })
  @ApiQuery({ name: 'lifecycle', required: false, enum: ['ACTIVE', 'ARCHIVED', 'ALL'] })
  @ApiResponse({ status: 200, description: 'Patients retrieved successfully.', isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findAll(@Query('search') search?: string, @Query('page') page = '1', @Query('limit') limit = '20', @Query('type') type?: PatientType, @Query('lifecycle') lifecycle: 'ACTIVE' | 'ARCHIVED' | 'ALL' = 'ACTIVE') {
    return this.patients.findAll(search, Number(page), Number(limit), type, lifecycle);
  }

  @Get(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.DOCTOR, UserRole.CLINIC_STAFF)
  @Permissions(Permission.PATIENTS_READ)
  @ApiOperation({
    summary: 'Get patient by ID',
    description: 'Retrieves a single patient record by their unique ID. Requires patients.read permission.',
  })
  @ApiParam({ name: 'id', description: 'Patient ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Patient retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Patient not found.' })
  findOne(@Param('id') id: string) {
    return this.patients.findOne(id);
  }

  @Put(':id/health-record')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.DOCTOR, UserRole.CLINIC_STAFF)
  @Permissions(Permission.CLINICAL_MANAGE)
  @ApiOperation({
    summary: 'Create or update the patient health record',
    description: 'Writes the long-term health record. Requires clinical.manage permission.',
  })
  @ApiParam({ name: 'id', description: 'Patient ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdatePatientHealthRecordDto })
  @ApiResponse({ status: 200, description: 'Health record written.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Patient not found.' })
  updateHealthRecord(@Param('id') id: string, @Body() dto: UpdatePatientHealthRecordDto, @Req() request: AuthenticatedRequest) {
    return this.patients.updateHealthRecord(id, dto, request.user.id);
  }

  @Post()
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF)
  @Permissions(Permission.PATIENTS_MANAGE)
  @ApiOperation({
    summary: 'Create a new patient',
    description: 'Registers a new patient record. Requires patients.manage permission.',
  })
  @ApiBody({ type: CreatePatientDto })
  @ApiResponse({ status: 201, description: 'Patient created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiConflictResponse({ description: 'Patient with this email or patient number already exists.' })
  create(@Body() dto: CreatePatientDto, @Req() request: AuthenticatedRequest) {
    return this.patients.create(dto, request.user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF)
  @Permissions(Permission.PATIENTS_MANAGE)
  @ApiOperation({
    summary: 'Update patient',
    description: 'Updates an existing patient record. Requires patients.manage permission.',
  })
  @ApiParam({ name: 'id', description: 'Patient ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdatePatientDto })
  @ApiResponse({ status: 200, description: 'Patient updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Patient not found.' })
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto, @Req() request: AuthenticatedRequest) {
    return this.patients.update(id, dto, request.user.id);
  }

  @Post(':id/archive')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF)
  @Permissions(Permission.PATIENTS_MANAGE)
  @ApiOperation({ summary: 'Archive a patient without deleting clinical history', description: 'Requires patients.manage permission.' })
  @ApiParam({ name: 'id', description: 'Patient ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 201, description: 'Patient archived.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Patient not found.' })
  archive(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.patients.remove(id, request.user.id);
  }

  @Post(':id/restore')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF)
  @Permissions(Permission.PATIENTS_MANAGE)
  @ApiOperation({ summary: 'Restore an archived patient and their existing clinical history', description: 'Requires patients.manage permission.' })
  @ApiParam({ name: 'id', description: 'Patient ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 201, description: 'Patient restored.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Patient not found.' })
  restore(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.patients.restore(id, request.user.id);
  }

  @Post(':id/documents')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF, UserRole.DOCTOR)
  @Permissions(Permission.PATIENTS_MANAGE, Permission.DOCUMENTS_MANAGE)
  @ApiOperation({
    summary: 'Upload a private document for a patient',
    description: 'Stores a document against the patient record. Requires both patients.manage and documents.manage permissions.',
  })
  @ApiParam({ name: 'id', description: 'Patient ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: CreateDocumentDto })
  @ApiResponse({ status: 201, description: 'Patient document stored privately.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Patient not found.' })
  addDocument(
    @Param('id') id: string,
    @Body() dto: CreateDocumentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.patients.addDocument(id, dto, request.user.id);
  }
}
