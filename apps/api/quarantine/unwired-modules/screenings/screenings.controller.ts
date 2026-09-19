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
import { ScreeningsService } from './screenings.service';
import { CreateScreeningDto, UpdateScreeningDto } from './dto';

@ApiTags('screenings')
@ApiBearerAuth('access-token')
@Controller('screenings')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class ScreeningsController {
  constructor(private readonly screeningsService: ScreeningsService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR')
  @Permissions(Permission.CLINICAL_READ)
  @ApiOperation({ summary: 'Get all screenings', description: 'Retrieves a list of all screening records. Requires clinical.read permission.' })
  @ApiResponse({ status: 200, description: 'Screenings retrieved successfully.', isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findAll() {
    return this.screeningsService.findAll();
  }

  @Get(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR')
  @Permissions(Permission.CLINICAL_READ)
  @ApiOperation({ summary: 'Get screening by ID', description: 'Retrieves a single screening record by its unique ID.' })
  @ApiParam({ name: 'id', description: 'Screening ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Screening retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Screening record not found.' })
  findOne(@Param('id') id: string) {
    return this.screeningsService.findOne(id);
  }

  @Post()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR')
  @Permissions(Permission.CLINICAL_READ, Permission.CLINICAL_MANAGE)
  @ApiOperation({ summary: 'Create a new screening', description: 'Creates a new screening record. Requires clinical.read and clinical.manage permissions.' })
  @ApiBody({ type: CreateScreeningDto })
  @ApiResponse({ status: 201, description: 'Screening record created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateScreeningDto) {
    return this.screeningsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'DOCTOR')
  @Permissions(Permission.CLINICAL_READ, Permission.CLINICAL_MANAGE)
  @ApiOperation({ summary: 'Update screening', description: 'Updates an existing screening record. Requires clinical.read and clinical.manage permissions.' })
  @ApiParam({ name: 'id', description: 'Screening ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdateScreeningDto })
  @ApiResponse({ status: 200, description: 'Screening record updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Screening record not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateScreeningDto) {
    return this.screeningsService.update(id, dto);
  }
}
