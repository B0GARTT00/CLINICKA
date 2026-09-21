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
import { EmergencyService } from './emergency.service';
import { CreateEmergencyDto, UpdateEmergencyDto } from './dto';

@ApiTags('emergency')
@ApiBearerAuth('access-token')
@Controller('emergency')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR')
  @Permissions(Permission.CLINICAL_READ)
  @ApiOperation({ summary: 'Get all emergency records', description: 'Retrieves a list of all emergency case records. Requires clinical.read permission.' })
  @ApiResponse({ status: 200, description: 'Emergency records retrieved successfully.', isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findAll() {
    return this.emergencyService.findAll();
  }

  @Get(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR')
  @Permissions(Permission.CLINICAL_READ)
  @ApiOperation({ summary: 'Get emergency record by ID', description: 'Retrieves a single emergency case record by its unique ID.' })
  @ApiParam({ name: 'id', description: 'Emergency record ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Emergency record retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Emergency record not found.' })
  findOne(@Param('id') id: string) {
    return this.emergencyService.findOne(id);
  }

  @Post()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR')
  @Permissions(Permission.CLINICAL_READ, Permission.CLINICAL_MANAGE)
  @ApiOperation({ summary: 'Create a new emergency record', description: 'Creates a new emergency case record. Requires clinical.read and clinical.manage permissions.' })
  @ApiBody({ type: CreateEmergencyDto })
  @ApiResponse({ status: 201, description: 'Emergency record created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateEmergencyDto) {
    return this.emergencyService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR')
  @Permissions(Permission.CLINICAL_READ, Permission.CLINICAL_MANAGE)
  @ApiOperation({ summary: 'Update emergency record', description: 'Updates an existing emergency case record. Requires clinical.read and clinical.manage permissions.' })
  @ApiParam({ name: 'id', description: 'Emergency record ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdateEmergencyDto })
  @ApiResponse({ status: 200, description: 'Emergency record updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Emergency record not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateEmergencyDto) {
    return this.emergencyService.update(id, dto);
  }
}
