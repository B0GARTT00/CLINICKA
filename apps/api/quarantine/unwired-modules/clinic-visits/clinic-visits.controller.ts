import { Controller, Get, Param, Post, Patch, Body, UseGuards } from '@nestjs/common';
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
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permission } from '../../auth/constants/permissions';
import { ClinicVisitsService } from './clinic-visits.service';
import { CreateClinicVisitDto, UpdateClinicVisitDto } from './dto';

@ApiTags('clinic-visits')
@ApiBearerAuth('access-token')
@Controller('clinic-visits')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class ClinicVisitsController {
  constructor(private readonly clinicVisitsService: ClinicVisitsService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR', 'CLINIC_STAFF')
  @Permissions(Permission.CLINICAL_READ)
  @ApiOperation({ summary: 'Get all clinic visits', description: 'Retrieves a list of all clinic visit records. Requires clinical.read permission.' })
  @ApiResponse({ status: 200, description: 'Clinic visits retrieved successfully.', isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findAll() {
    return this.clinicVisitsService.findAll();
  }

  @Get(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR', 'CLINIC_STAFF')
  @Permissions(Permission.CLINICAL_READ)
  @ApiOperation({ summary: 'Get clinic visit by ID', description: 'Retrieves a single clinic visit record by its unique ID.' })
  @ApiParam({ name: 'id', description: 'Clinic visit ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Clinic visit retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Clinic visit not found.' })
  findOne(@Param('id') id: string) {
    return this.clinicVisitsService.findOne(id);
  }

  @Post()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR', 'CLINIC_STAFF')
  @Permissions(Permission.CLINICAL_READ, Permission.CLINICAL_MANAGE)
  @ApiOperation({ summary: 'Create a new clinic visit', description: 'Creates a new clinic visit record. Requires clinical.read and clinical.manage permissions.' })
  @ApiBody({ type: CreateClinicVisitDto })
  @ApiResponse({ status: 201, description: 'Clinic visit created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateClinicVisitDto) {
    return this.clinicVisitsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR', 'CLINIC_STAFF')
  @Permissions(Permission.CLINICAL_READ, Permission.CLINICAL_MANAGE)
  @ApiOperation({ summary: 'Update clinic visit', description: 'Updates an existing clinic visit record. Requires clinical.read and clinical.manage permissions.' })
  @ApiParam({ name: 'id', description: 'Clinic visit ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdateClinicVisitDto })
  @ApiResponse({ status: 200, description: 'Clinic visit updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Clinic visit not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateClinicVisitDto) {
    return this.clinicVisitsService.update(id, dto);
  }
}
