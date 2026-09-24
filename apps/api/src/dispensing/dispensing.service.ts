import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InventoryTransactionType, AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DispensingValidator } from './validation/dispensing-validator';
import { DispensingDiscrepancyReporter } from './monitoring/discrepancy-reporter';
import { CreateDispensationDto } from './dto';

/**
 * DispensingService
 *
 * Manages medicine dispensing with integrity enforcement:
 *   1. Validates dispensation against visit prescriptions
 *   2. Enforces quantity limits
 *   3. Records audit trail linking to visit and prescription
 */
@Injectable()
export class DispensingService {
  private readonly logger = new Logger(DispensingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly validator: DispensingValidator,
    private readonly reporter: DispensingDiscrepancyReporter,
  ) {}

  list() {
    return this.prisma.medicineDispensation.findMany({
      include: {
        patient: true,
        clinicVisit: true,
        items: { include: { medicineBatch: { include: { medicine: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async create(dto: CreateDispensationDto, actorId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { OR: [{ id: dto.patientId }, { patientNumber: dto.patientId }], deletedAt: null },
    });
    if (!patient) throw new NotFoundException('Active patient not found.');

    if (dto.clinicVisitId) {
      const visit = await this.prisma.clinicVisit.findUnique({ where: { id: dto.clinicVisitId } });
      if (!visit || visit.patientId !== patient.id) {
        throw new NotFoundException('Clinic visit not found for this patient.');
      }
    }

    const result = await this.prisma.$transaction(async (transaction) => {
      const validation = await this.validator.validate(patient.id, dto.clinicVisitId, dto.items, { transaction });
      if (!validation.valid) {
        const firstError = validation.errors[0];
        throw new BadRequestException(
          `Dispensing validation failed: ${firstError.message}. ` +
          `All errors: ${validation.errors.map((error) => error.message).join('; ')}`,
        );
      }

      for (const item of dto.items) {
        const changed = await transaction.medicineBatch.updateMany({
          where: { id: item.medicineBatchId, quantity: { gte: item.quantity }, expiresAt: { gt: new Date() } },
          data: { quantity: { decrement: item.quantity } },
        });
        if (changed.count !== 1) {
          throw new BadRequestException('Insufficient stock or expired medicine batch.');
        }
      }

      const record = await transaction.medicineDispensation.create({
        data: {
          patientId: patient.id,
          clinicVisitId: dto.clinicVisitId,
          dispensedById: actorId,
          notes: dto.notes,
          items: { create: dto.items },
        },
        include: { patient: true, items: { include: { medicineBatch: { include: { medicine: true } } } } },
      });

      for (const item of dto.items) {
        await transaction.inventoryTransaction.create({
          data: {
            medicineBatchId: item.medicineBatchId,
            type: InventoryTransactionType.DISPENSE,
            quantity: -item.quantity,
            reason: `Dispensed to ${patient.patientNumber}`,
            actorId,
          },
        });
      }

      return { record, warnings: validation.warnings };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    for (const warning of result.warnings) {
      this.logger.warn(`Dispensing warning for patient ${patient.patientNumber}: ${warning.message}`);
    }

    await this.audit.record(
      actorId,
      AuditAction.MEDICINE_DISPENSED,
      'MedicineDispensation',
      result.record.id,
      {
        metadata: {
          clinicVisitId: dto.clinicVisitId,
          itemCount: dto.items.length,
          warnings: result.warnings.map((warning) => warning.code),
        },
      },
    );

    return result.record;
  }

  /**
   * Get reconciliation report for a specific visit.
   */
  async getVisitReconciliation(clinicVisitId: string) {
    return this.reporter.getVisitReconciliation(clinicVisitId);
  }

  /**
   * Get daily exception report (dispensations without prescriptions).
   */
  async getExceptionReport(date?: Date) {
    return this.reporter.getExceptionReport(date);
  }
}
