import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permission } from '../../auth/constants/permissions';
import { CreatePatientDto, UpdatePatientDto } from './dto';
import { PatientsService } from './patients.service';

@ApiTags('patients')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get('me')
  @Roles('STUDENT', 'FACULTY_STAFF')
  @Permissions(Permission.OWN_PROFILE_READ)
  ownProfile(@Req() request: { user: { id: string } }) {
    return this.patients.findOwn(request.user.id);
  }

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR', 'CLINIC_STAFF')
  @ApiOperation({
    summary: 'List patients',
    description: 'Retrieves a paginated list of patients. Supports optional search filtering.',
  })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'Doe' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'type', required: false, enum: PatientType })
  @ApiResponse({ status: 200, description: 'Patients retrieved successfully.', isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findAll(@Query('search') search?: string, @Query('page') page = '1', @Query('limit') limit = '20', @Query('type') type?: PatientType) {
    return this.patients.findAll(search, Number(page), Number(limit), type);
  }

  @Get(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR', 'CLINIC_STAFF')
  @ApiOperation({
    summary: 'Get patient by ID',
    description: 'Retrieves a single patient record by their unique ID.',
  })
  @ApiParam({ name: 'id', description: 'Patient ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Patient retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Patient not found.' })
  findOne(@Param('id') id: string) {
    return this.patients.findOne(id);
  }

  @Post()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
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
  create(@Body() dto: CreatePatientDto, @Req() request: { user: { id: string } }) {
    return this.patients.create(dto, request.user.id);
  }

  @Patch(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
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
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto, @Req() request: { user: { id: string } }) {
    return this.patients.update(id, dto, request.user.id);
  }
}
