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
import { ClearancesService } from './clearances.service';
import { CreateClearanceDto, UpdateClearanceDto } from './dto';

@ApiTags('clearances')
@ApiBearerAuth('access-token')
@Controller('clearances')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class ClearancesController {
  constructor(private readonly clearancesService: ClearancesService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  @Permissions(Permission.CLEARANCES_MANAGE)
  @ApiOperation({ summary: 'Get all clearances', description: 'Retrieves a list of all clearance records. Requires clearances.manage permission.' })
  @ApiResponse({ status: 200, description: 'Clearances retrieved successfully.', isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findAll() {
    return this.clearancesService.findAll();
  }

  @Get(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  @Permissions(Permission.CLEARANCES_MANAGE)
  @ApiOperation({ summary: 'Get clearance by ID', description: 'Retrieves a single clearance record by its unique ID.' })
  @ApiParam({ name: 'id', description: 'Clearance ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Clearance retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Clearance not found.' })
  findOne(@Param('id') id: string) {
    return this.clearancesService.findOne(id);
  }

  @Post()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  @Permissions(Permission.CLEARANCES_MANAGE)
  @ApiOperation({ summary: 'Create a new clearance', description: 'Creates a new clearance record. Requires clearances.manage permission.' })
  @ApiBody({ type: CreateClearanceDto })
  @ApiResponse({ status: 201, description: 'Clearance created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateClearanceDto) {
    return this.clearancesService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  @Permissions(Permission.CLEARANCES_MANAGE)
  @ApiOperation({ summary: 'Update clearance', description: 'Updates an existing clearance record. Requires clearances.manage permission.' })
  @ApiParam({ name: 'id', description: 'Clearance ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdateClearanceDto })
  @ApiResponse({ status: 200, description: 'Clearance updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Clearance not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateClearanceDto) {
    return this.clearancesService.update(id, dto);
  }
}
