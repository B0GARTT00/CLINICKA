import { Controller, Get, Param, Post, Patch, Delete, Body, UseGuards } from '@nestjs/common';
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
import { InventoryService } from './inventory.service';
import { CreateInventoryDto, UpdateInventoryDto } from './dto';

@ApiTags('inventory')
@ApiBearerAuth('access-token')
@Controller('inventory')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  @Permissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Get all inventory items', description: 'Retrieves a list of all inventory items. Requires inventory.manage permission.' })
  @ApiResponse({ status: 200, description: 'Inventory items retrieved successfully.', isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  @Permissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Get inventory item by ID', description: 'Retrieves a single inventory item by its unique ID.' })
  @ApiParam({ name: 'id', description: 'Inventory item ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Inventory item retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Inventory item not found.' })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post()
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  @Permissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Create a new inventory item', description: 'Adds a new item to the inventory. Requires inventory.manage permission.' })
  @ApiBody({ type: CreateInventoryDto })
  @ApiResponse({ status: 201, description: 'Inventory item created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  create(@Body() dto: CreateInventoryDto) {
    return this.inventoryService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  @Permissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Update inventory item', description: 'Updates an existing inventory item. Requires inventory.manage permission.' })
  @ApiParam({ name: 'id', description: 'Inventory item ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiBody({ type: UpdateInventoryDto })
  @ApiResponse({ status: 200, description: 'Inventory item updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Inventory item not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateInventoryDto) {
    return this.inventoryService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  @Permissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Remove inventory item', description: 'Removes an inventory item from the system. Requires inventory.manage permission.' })
  @ApiParam({ name: 'id', description: 'Inventory item ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Inventory item removed successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required or token is invalid.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  @ApiNotFoundResponse({ description: 'Inventory item not found.' })
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
