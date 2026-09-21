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
import { HealthRequirementsService } from './health-requirements.service';
import { CreateHealthRequirementDto, UpdateHealthRequirementDto } from './dto';

@ApiTags('health-requirements')
@ApiBearerAuth('access-token')
@Controller('health-requirements')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class HealthRequirementsController {
  constructor(private readonly healthRequirementsService: HealthRequirementsService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  @Permissions(Permission.REQUIREMENTS_MANAGE)
  @ApiOperation({ summary: 'Get all health requirements', description: 'Retrieves a list of all health requirement records. Requires requirements.manage permission.' })
  @ApiResponse({ status: 200, description: 'Health requirements retrieved successfully.', isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findAll() {
    return this.healthRequirementsService.findAll();
  }

  @Get(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  @Permissions(Permission.REQUIREMENTS_MANAGE)
  @ApiOperation({ summary: 'Get health requirement by ID', description: 'Retrieves a single health requirement record by its unique ID.' })
  @ApiParam({ name: 'id', description: 'Health requirement ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Health requirement retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Health requirement not found.' })
  findOne(@Param('id') id: string) {
    return this.healthRequirementsService.findOne(id);
  }

  @Post()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  @Permissions(Permission.REQUIREMENTS_MANAGE)
  @ApiOperation({ summary: 'Create a new health requirement', description: 'Creates a new health requirement record. Requires requirements.manage permission.' })
  @ApiBody({ type: CreateHealthRequirementDto })
  @ApiResponse({ status: 201, description: 'Health requirement created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateHealthRequirementDto) {
    return this.healthRequirementsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  @Permissions(Permission.REQUIREMENTS_MANAGE)
  @ApiOperation({ summary: 'Update health requirement', description: 'Updates an existing health requirement record. Requires requirements.manage permission.' })
  @ApiParam({ name: 'id', description: 'Health requirement ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdateHealthRequirementDto })
  @ApiResponse({ status: 200, description: 'Health requirement updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Health requirement not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateHealthRequirementDto) {
    return this.healthRequirementsService.update(id, dto);
  }
}
