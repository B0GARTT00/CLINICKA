import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
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
import { DispensingService } from './dispensing.service';
import { CreateDispensingDto } from './dto';

@ApiTags('dispensing')
@ApiBearerAuth('access-token')
@Controller('dispensing')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class DispensingController {
  constructor(private readonly dispensingService: DispensingService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  @Permissions(Permission.CLINICAL_READ, Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Get all dispensing records', description: 'Retrieves a list of all dispensing records. Requires clinical.read and inventory.manage permissions.' })
  @ApiResponse({ status: 200, description: 'Dispensing records retrieved successfully.', isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findAll() {
    return this.dispensingService.findAll();
  }

  @Get(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  @Permissions(Permission.CLINICAL_READ, Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Get dispensing record by ID', description: 'Retrieves a single dispensing record by its unique ID.' })
  @ApiParam({ name: 'id', description: 'Dispensing record ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Dispensing record retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Dispensing record not found.' })
  findOne(@Param('id') id: string) {
    return this.dispensingService.findOne(id);
  }

  @Post()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  @Permissions(Permission.CLINICAL_READ, Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Create a new dispensing record', description: 'Creates a new dispensing record. Requires clinical.read and inventory.manage permissions.' })
  @ApiBody({ type: CreateDispensingDto })
  @ApiResponse({ status: 201, description: 'Dispensing record created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateDispensingDto) {
    return this.dispensingService.create(dto);
  }
}
