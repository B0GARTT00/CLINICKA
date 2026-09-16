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
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto, UpdateConsultationDto } from './dto';

@ApiTags('consultations')
@ApiBearerAuth('access-token')
@Controller('consultations')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR', 'CLINIC_STAFF')
  @Permissions(Permission.CLINICAL_READ)
  @ApiOperation({ summary: 'Get all consultations', description: 'Retrieves a list of all consultation records. Requires clinical.read permission.' })
  @ApiResponse({ status: 200, description: 'Consultations retrieved successfully.', isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findAll() {
    return this.consultationsService.findAll();
  }

  @Get(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR', 'CLINIC_STAFF')
  @Permissions(Permission.CLINICAL_READ)
  @ApiOperation({ summary: 'Get consultation by ID', description: 'Retrieves a single consultation record by its unique ID.' })
  @ApiParam({ name: 'id', description: 'Consultation ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Consultation retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Consultation not found.' })
  findOne(@Param('id') id: string) {
    return this.consultationsService.findOne(id);
  }

  @Post()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR', 'CLINIC_STAFF')
  @Permissions(Permission.CLINICAL_READ, Permission.CLINICAL_MANAGE)
  @ApiOperation({ summary: 'Create a new consultation', description: 'Creates a new consultation record. Requires clinical.read and clinical.manage permissions.' })
  @ApiBody({ type: CreateConsultationDto })
  @ApiResponse({ status: 201, description: 'Consultation created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateConsultationDto) {
    return this.consultationsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR', 'CLINIC_STAFF')
  @Permissions(Permission.CLINICAL_READ, Permission.CLINICAL_MANAGE)
  @ApiOperation({ summary: 'Update consultation', description: 'Updates an existing consultation record. Requires clinical.read and clinical.manage permissions.' })
  @ApiParam({ name: 'id', description: 'Consultation ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdateConsultationDto })
  @ApiResponse({ status: 200, description: 'Consultation updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Consultation not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateConsultationDto) {
    return this.consultationsService.update(id, dto);
  }
}
