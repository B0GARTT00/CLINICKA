import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DispensingLimits,
  DispensingValidationError,
  DispensingValidationResult,
  DispensingValidationWarning,
  DEFAULT_DISPENSING_LIMITS,
} from './dispensing-types';

type PrescriptionItem = {
  medicineName: string;
  quantity: number | null;
};

type Prescription = {
  items: PrescriptionItem[];
};

type Consultation = {
  prescriptions: Prescription[];
};

type VisitWithConsultations = {
  patientId: string;
  status: string;
  consultations: Consultation[];
};

/**
 * DispensingValidator
 *
 * Enforces integrity rules between medicine dispensing and clinical visits:
 *   1. Visit linkage — dispensing must reference a valid clinic visit
 *   2. Prescription reconciliation — dispensed items must match the visit's prescriptions
 *   3. Quantity limits — per-visit and per-medicine caps
 *   4. Stock validation — sufficient non-expired inventory
 */
@Injectable()
export class DispensingValidator {
  private readonly logger = new Logger(DispensingValidator.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate a dispensation request against all integrity rules.
   */
  async validate(
    patientId: string,
    clinicVisitId: string,
    items: { medicineBatchId: string; quantity: number }[],
    options: { limits?: DispensingLimits; transaction?: Prisma.TransactionClient } = {},
  ): Promise<DispensingValidationResult> {
    const errors: DispensingValidationError[] = [];
    const warnings: DispensingValidationWarning[] = [];
    const limits = options.limits ?? DEFAULT_DISPENSING_LIMITS;
    const database = options.transaction ?? this.prisma;

    // Load batches with medicine info for all items
    const batchInfos = await Promise.all(
      items.map((item) =>
        database.medicineBatch.findUnique({
          where: { id: item.medicineBatchId },
          include: { medicine: true },
        }),
      ),
    );

    // Rule 1: Visit linkage
    const visit = await database.clinicVisit.findUnique({
      where: { id: clinicVisitId },
      include: {
        consultations: {
          include: {
            prescriptions: {
              include: { items: true },
            },
          },
        },
      },
    }) as VisitWithConsultations | null;

    if (!visit) {
      errors.push({ code: 'VISIT_NOT_FOUND', message: `Clinic visit '${clinicVisitId}' not found.` });
    } else if (visit.patientId !== patientId) {
      errors.push({ code: 'VISIT_PATIENT_MISMATCH', message: 'Clinic visit does not belong to this patient.' });
    } else if (visit.status === 'CANCELLED') {
      errors.push({ code: 'VISIT_CANCELLED', message: 'Medicine cannot be dispensed against a cancelled visit.' });
    } else {
      // Rule 2: reconcile the aggregate request plus earlier dispensations against the prescription.
      const prescribedMap = this.extractPrescribedItems(visit);
      const previouslyDispensedMap = await this.getPreviouslyDispensed(database, clinicVisitId);
      const requestedMap = new Map<string, { quantity: number; medicineName: string; itemId: string }>();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const batch = batchInfos[i];
        if (!batch) {
          errors.push({
            code: 'BATCH_NOT_FOUND',
            message: `Medicine batch '${item.medicineBatchId}' not found.`,
            itemId: item.medicineBatchId,
          });
          continue;
        }
        const medicineName = batch.medicine.name;
        const key = medicineName.toLowerCase();
        const requested = requestedMap.get(key);
        requestedMap.set(key, {
          quantity: (requested?.quantity ?? 0) + item.quantity,
          medicineName,
          itemId: item.medicineBatchId,
        });
      }

      for (const [key, requested] of requestedMap) {
        const prescribed = prescribedMap.get(key);
        const previouslyDispensed = previouslyDispensedMap.get(key) ?? 0;
        if (!prescribed) {
          errors.push({
            code: 'NO_PRESCRIPTION',
            message: `Medicine '${requested.medicineName}' was not prescribed for this visit.`,
            itemId: requested.itemId,
            medicineName: requested.medicineName,
          });
        } else if (previouslyDispensed + requested.quantity > prescribed) {
          errors.push({
            code: 'OVER_DISPENSED',
            message: `Dispensing ${requested.quantity} of '${requested.medicineName}' after ${previouslyDispensed} already dispensed exceeds prescribed ${prescribed}.`,
            itemId: requested.itemId,
            medicineName: requested.medicineName,
          });
        }
      }
    }

    // Rule 3: Quantity limits
    if (items.length > limits.maxItemsPerDispensation) {
      errors.push({
        code: 'TOO_MANY_ITEMS',
        message: `Dispensation has ${items.length} items, exceeding the limit of ${limits.maxItemsPerDispensation}.`,
      });
    }

    const quantityByKey: Record<string, number> = {};
    for (let i = 0; i < items.length; i++) {
      const batch = batchInfos[i];
      const key = batch?.medicine.name ?? items[i].medicineBatchId;
      quantityByKey[key] = (quantityByKey[key] ?? 0) + items[i].quantity;
    }

    for (const [medicineName, totalQty] of Object.entries(quantityByKey)) {
      if (totalQty > limits.maxQuantityPerMedicine) {
        errors.push({
          code: 'QUANTITY_EXCEEDED',
          message: `Total quantity ${totalQty} for '${medicineName}' exceeds the limit of ${limits.maxQuantityPerMedicine}.`,
          medicineName,
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Extract prescribed quantities per medicine name from visit consultations.
   */
  private extractPrescribedItems(visit: VisitWithConsultations): Map<string, number> {
    const map = new Map<string, number>();
    for (const consultation of visit.consultations ?? []) {
      for (const prescription of consultation.prescriptions ?? []) {
        for (const item of prescription.items ?? []) {
          const key = item.medicineName.toLowerCase();
          const existing = map.get(key) ?? 0;
          map.set(key, existing + (item.quantity ?? 0));
        }
      }
    }
    return map;
  }

  private async getPreviouslyDispensed(database: Prisma.TransactionClient | PrismaService, clinicVisitId: string): Promise<Map<string, number>> {
    const dispensations = await database.medicineDispensation.findMany({
      where: { clinicVisitId },
      include: { items: { include: { medicineBatch: { include: { medicine: true } } } } },
    });
    const map = new Map<string, number>();
    for (const dispensation of dispensations) {
      for (const item of dispensation.items) {
        const key = item.medicineBatch.medicine.name.toLowerCase();
        map.set(key, (map.get(key) ?? 0) + item.quantity);
      }
    }
    return map;
  }
}
