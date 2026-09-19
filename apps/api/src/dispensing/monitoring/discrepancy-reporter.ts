import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * DispensingDiscrepancyReporter
 *
 * Generates reconciliation reports comparing prescribed vs. dispensed medications
 * per patient visit. Flags discrepancies for investigation.
 */
@Injectable()
export class DispensingDiscrepancyReporter {
  private readonly logger = new Logger(DispensingDiscrepancyReporter.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a reconciliation report for a specific visit.
   * Returns prescribed vs. dispensed comparison.
   */
  async getVisitReconciliation(clinicVisitId: string) {
    const visit = await this.prisma.clinicVisit.findUnique({
      where: { id: clinicVisitId },
      include: {
        consultations: {
          include: {
            prescriptions: { include: { items: true } },
          },
        },
        medicineDispensations: {
          include: { items: { include: { medicineBatch: { include: { medicine: true } } } } },
        },
      },
    });

    if (!visit) return null;

    // Aggregate prescribed quantities by medicine name
    const prescribedMap = new Map<string, number>();
    for (const consultation of visit.consultations ?? []) {
      for (const prescription of consultation.prescriptions ?? []) {
        for (const item of prescription.items ?? []) {
          const key = item.medicineName.toLowerCase();
          prescribedMap.set(key, (prescribedMap.get(key) ?? 0) + (item.quantity ?? 0));
        }
      }
    }

    // Aggregate dispensed quantities by medicine name
    const dispensedMap = new Map<string, number>();
    for (const dispensation of visit.medicineDispensations ?? []) {
      for (const item of dispensation.items ?? []) {
        const key = item.medicineBatch.medicine.name.toLowerCase();
        dispensedMap.set(key, (dispensedMap.get(key) ?? 0) + item.quantity);
      }
    }

    // Build reconciliation
    const allMedicines = new Set([...prescribedMap.keys(), ...dispensedMap.keys()]);
    const reconciliation = [...allMedicines].map((name) => {
      const prescribed = prescribedMap.get(name) ?? 0;
      const dispensed = dispensedMap.get(name) ?? 0;
      return {
        medicineName: name,
        prescribed,
        dispensed,
        discrepancy: dispensed - prescribed,
        status: dispensed > prescribed ? 'OVER_DISPENSED' : dispensed < prescribed ? 'UNDER_DISPENSED' : 'MATCHED',
      };
    });

    return {
      clinicVisitId,
      patientId: visit.patientId,
      reconciledAt: new Date().toISOString(),
      items: reconciliation,
      hasDiscrepancies: reconciliation.some((r) => r.status !== 'MATCHED'),
    };
  }

  /**
   * Generate a daily exception report: dispensations without prescriptions.
   */
  async getExceptionReport(date?: Date) {
    const targetDate = date ?? new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dispensations = await this.prisma.medicineDispensation.findMany({
      where: {
        createdAt: { gte: startOfDay, lt: endOfDay },
        clinicVisitId: { not: null },
      },
      include: {
        clinicVisit: {
          include: {
            consultations: {
              include: {
                prescriptions: { include: { items: true } },
              },
            },
          },
        },
        items: { include: { medicineBatch: { include: { medicine: true } } } },
      },
    });

    const exceptions = [];
    for (const dispensation of dispensations) {
      const prescribedNames = new Set<string>();
      for (const consultation of dispensation.clinicVisit?.consultations ?? []) {
        for (const prescription of consultation.prescriptions ?? []) {
          for (const item of prescription.items ?? []) {
            prescribedNames.add(item.medicineName.toLowerCase());
          }
        }
      }

      for (const item of dispensation.items) {
        const medicineName = item.medicineBatch.medicine.name.toLowerCase();
        if (!prescribedNames.has(medicineName)) {
          exceptions.push({
            dispensationId: dispensation.id,
            clinicVisitId: dispensation.clinicVisitId,
            patientId: dispensation.patientId,
            medicineName: item.medicineBatch.medicine.name,
            quantity: item.quantity,
            dispensedAt: dispensation.createdAt,
          });
        }
      }
    }

    return {
      date: targetDate.toISOString().split('T')[0],
      exceptionCount: exceptions.length,
      exceptions,
    };
  }
}