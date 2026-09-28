import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ACCESS_TOKEN_SCHEME } from '../auth/constants/api-security';
import { Permission } from '../auth/constants/permissions';
import { UserRole } from '../auth/constants/roles';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateMedicineDto, InventoryTransactionQueryDto, StockInDto } from './dto';
import { InventoryService } from './inventory.service';


/** Stock levels are visible to staff who run the clinic; changes are narrower. */
const STOCK_READ_ROLES = [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE, UserRole.CLINIC_STAFF] as const;
const STOCK_WRITE_ROLES = [UserRole.ADMINISTRATOR, UserRole.CLINIC_NURSE] as const;

@ApiTags('inventory')
@ApiBearerAuth(ACCESS_TOKEN_SCHEME)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('medicines')
  @Roles(...STOCK_READ_ROLES)
  @Permissions(Permission.INVENTORY_READ)
  @ApiOperation({ summary: 'List medicines in stock', description: 'Requires inventory.read permission.' })
  @ApiResponse({ status: 200, description: 'Medicines retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  listMedicines() {
    return this.inventory.listMedicines();
  }

  @Post('medicines')
  @Roles(...STOCK_WRITE_ROLES)
  @Permissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Add a medicine to the catalogue', description: 'Requires inventory.manage permission.' })
  @ApiResponse({ status: 201, description: 'Medicine created.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  createMedicine(@Body() dto: CreateMedicineDto, @Req() request: AuthenticatedRequest) {
    return this.inventory.createMedicine(dto, request.user.id);
  }

  @Post('stock-in')
  @Roles(...STOCK_WRITE_ROLES)
  @Permissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Record a stock-in transaction', description: 'Requires inventory.manage permission.' })
  @ApiResponse({ status: 201, description: 'Stock-in recorded.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  stockIn(@Body() dto: StockInDto, @Req() request: AuthenticatedRequest) {
    return this.inventory.stockIn(dto, request.user.id);
  }

  @Get('transactions')
  @Roles(...STOCK_READ_ROLES)
  @Permissions(Permission.INVENTORY_TRANSACTIONS_READ)
  @ApiOperation({ summary: 'Read inventory movement history', description: 'Requires inventory.transactions.read permission.' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  listTransactions(@Query() query: InventoryTransactionQueryDto) {
    return this.inventory.listTransactions(query);
  }
}
