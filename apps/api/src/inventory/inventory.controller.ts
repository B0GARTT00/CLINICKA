import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateMedicineDto, InventoryTransactionQueryDto, StockInDto } from './dto';
import { InventoryService } from './inventory.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('medicines')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  listMedicines() {
    return this.inventory.listMedicines();
  }

  @Post('medicines')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  createMedicine(@Body() dto: CreateMedicineDto, @Req() request: AuthenticatedRequest) {
    return this.inventory.createMedicine(dto, request.user.id);
  }

  @Post('stock-in')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE')
  stockIn(@Body() dto: StockInDto, @Req() request: AuthenticatedRequest) {
    return this.inventory.stockIn(dto, request.user.id);
  }

  @Get('transactions')
  @Roles('ADMINISTRATOR', 'CLINIC_NURSE', 'CLINIC_STAFF')
  listTransactions(@Query() query: InventoryTransactionQueryDto) {
    return this.inventory.listTransactions(query);
  }
}
