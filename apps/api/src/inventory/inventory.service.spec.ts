import { BadRequestException } from '@nestjs/common';
import { InventoryTransactionType } from '@prisma/client';
import { InventoryService } from './inventory.service';

function setup() {
  const prisma = {
    medicine: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    inventoryTransaction: { findMany: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  return { prisma, service: new InventoryService(prisma as never) };
}

describe('InventoryService', () => {
  afterEach(() => jest.useRealTimers());

  it('excludes expired batches from available stock and exposes batch states', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-21T00:00:00.000Z'));
    const { prisma, service } = setup();
    prisma.medicine.findMany.mockResolvedValue([{
      id: 'medicine-1', name: 'Paracetamol', genericName: null, dosageForm: 'Tablet', unit: 'tablet', reorderLevel: 10,
      batches: [
        { id: 'expired', batchNumber: 'OLD', quantity: 50, expiresAt: new Date('2026-09-20T00:00:00.000Z') },
        { id: 'soon', batchNumber: 'SOON', quantity: 5, expiresAt: new Date('2026-10-01T00:00:00.000Z') },
        { id: 'empty', batchNumber: 'EMPTY', quantity: 0, expiresAt: new Date('2027-01-01T00:00:00.000Z') },
      ],
    }]);

    const [medicine] = await service.listMedicines();

    expect(medicine).toMatchObject({ stock: 5, totalStock: 55, expiredStock: 50, stockState: 'LOW_STOCK', lowStock: true });
    expect(medicine.batches.map((batch) => batch.state)).toEqual(['EXPIRED', 'EXPIRING_SOON', 'DEPLETED']);
    expect(medicine.batches.map((batch) => batch.dispensable)).toEqual([false, true, false]);
  });

  it('reports out of stock when only expired inventory remains', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-21T00:00:00.000Z'));
    const { prisma, service } = setup();
    prisma.medicine.findMany.mockResolvedValue([{ id: 'medicine-1', name: 'Medicine', reorderLevel: 0, batches: [{ id: 'batch-1', quantity: 4, expiresAt: new Date('2026-01-01T00:00:00.000Z') }] }]);
    const [medicine] = await service.listMedicines();
    expect(medicine).toMatchObject({ stock: 0, expiredStock: 4, stockState: 'OUT_OF_STOCK' });
  });

  it('rejects stock-in for an already expired batch', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-21T00:00:00.000Z'));
    const { prisma, service } = setup();
    prisma.medicine.findUnique.mockResolvedValue({ id: 'medicine-1', deletedAt: null });
    await expect(service.stockIn({ medicineId: 'medicine-1', batchNumber: 'OLD', expiresAt: '2026-09-20T00:00:00.000Z', quantity: 2 }, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('applies movement, medicine, search, and date filters to transaction history', async () => {
    const { prisma, service } = setup();
    prisma.inventoryTransaction.findMany.mockResolvedValue([]);
    await service.listTransactions({ type: InventoryTransactionType.DISPENSE, medicineId: 'medicine-1', search: 'LOT', from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.999Z' });
    expect(prisma.inventoryTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ type: InventoryTransactionType.DISPENSE, createdAt: { gte: new Date('2026-09-01T00:00:00.000Z'), lte: new Date('2026-09-30T23:59:59.999Z') }, medicineBatch: { is: { AND: expect.any(Array) } } }),
      take: 250,
    }));
  });
});
