<<<<<<< HEAD
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, InventoryTransactionType, Prisma } from '@prisma/client';
=======
import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTransactionType, AuditAction } from '@prisma/client';
>>>>>>> 25d03fe7c9f7859ebf2def8c5ffb547212f2ae50
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicineDto, InventoryTransactionQueryDto, StockInDto } from './dto';

const EXPIRING_SOON_DAYS = 30;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listMedicines() {
    const medicines = await this.prisma.medicine.findMany({ where: { deletedAt: null }, include: { batches: { orderBy: { expiresAt: 'asc' } } }, orderBy: { name: 'asc' } });
    const now = new Date();
    const expiringSoonAt = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);
    return medicines.map((medicine) => {
      const batches = medicine.batches.map((batch) => {
        const expired = batch.expiresAt <= now;
        const depleted = batch.quantity <= 0;
        const state = expired ? 'EXPIRED' : depleted ? 'DEPLETED' : batch.expiresAt <= expiringSoonAt ? 'EXPIRING_SOON' : 'AVAILABLE';
        return { ...batch, state, dispensable: !expired && !depleted };
      });
      const stock = batches.reduce((total, batch) => total + (batch.dispensable ? batch.quantity : 0), 0);
      const totalStock = batches.reduce((total, batch) => total + batch.quantity, 0);
      const expiredStock = batches.reduce((total, batch) => total + (batch.state === 'EXPIRED' ? batch.quantity : 0), 0);
      const stockState = stock === 0 ? 'OUT_OF_STOCK' : stock <= medicine.reorderLevel ? 'LOW_STOCK' : 'IN_STOCK';
      return { ...medicine, batches, stock, totalStock, expiredStock, stockState, lowStock: stockState !== 'IN_STOCK' };
    });
  }

  async createMedicine(dto: CreateMedicineDto, actorId: string) {
    const medicine = await this.prisma.medicine.create({ data: dto });
    await this.audit(actorId, AuditAction.MEDICINE_CREATED, medicine.id);
    return medicine;
  }

  async stockIn(dto: StockInDto, actorId: string) {
    const medicine = await this.prisma.medicine.findUnique({ where: { id: dto.medicineId } });
    if (!medicine || medicine.deletedAt) throw new NotFoundException('Medicine not found.');
    const expiresAt = new Date(dto.expiresAt);
    if (expiresAt <= new Date()) throw new BadRequestException('Expiration date must be in the future.');
    const batch = await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.medicineBatch.findUnique({ where: { medicineId_batchNumber: { medicineId: dto.medicineId, batchNumber: dto.batchNumber } } });
      const updated = existing
        ? await transaction.medicineBatch.update({ where: { id: existing.id }, data: { quantity: { increment: dto.quantity }, expiresAt, supplier: dto.supplier } })
        : await transaction.medicineBatch.create({ data: { medicineId: dto.medicineId, batchNumber: dto.batchNumber, expiresAt, quantity: dto.quantity, supplier: dto.supplier } });
      await transaction.inventoryTransaction.create({ data: { medicineBatchId: updated.id, type: InventoryTransactionType.STOCK_IN, quantity: dto.quantity, actorId } });
      return updated;
    });
    await this.audit(actorId, AuditAction.MEDICINE_STOCKED_IN, batch.id);
    return batch;
  }

  listTransactions(query: InventoryTransactionQueryDto = {}) {
    const where: Prisma.InventoryTransactionWhereInput = {};
    if (query.type) where.type = query.type;
    const batchConditions: Prisma.MedicineBatchWhereInput[] = [];
    if (query.medicineId) batchConditions.push({ medicineId: query.medicineId });
    if (query.search) {
      batchConditions.push({
        OR: [
          { batchNumber: { contains: query.search } },
          { medicine: { OR: [{ name: { contains: query.search } }, { genericName: { contains: query.search } }] } },
        ],
      });
    }
    if (batchConditions.length) where.medicineBatch = { is: { AND: batchConditions } };
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    return this.prisma.inventoryTransaction.findMany({ where, include: { medicineBatch: { include: { medicine: true } } }, orderBy: { createdAt: 'desc' }, take: 250 });
  }

  private audit(actorId: string, action: AuditAction, entityId: string) {
    return this.prisma.auditLog.create({ data: { actorId, action, entity: 'Medicine', entityId } });
  }
}
