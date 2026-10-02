import { BadRequestException, Injectable } from '@nestjs/common';
import { AppointmentStatus, AuditAction, ClearanceStatus, RequirementStatus, VisitStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportDomain, ReportFiltersDto } from './dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async summary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [patients, visitsToday, visitsCompleted, appointmentsUpcoming, pendingRequirements, clearancesForReview, medicines] = await Promise.all([
      this.prisma.patient.count({ where: { deletedAt: null } }),
      this.prisma.clinicVisit.count({ where: { visitDate: { gte: today, lt: tomorrow } } }),
      this.prisma.clinicVisit.count({ where: { status: VisitStatus.COMPLETED } }),
      this.prisma.appointment.count({ where: { scheduledAt: { gte: new Date() }, status: { in: [AppointmentStatus.PENDING, AppointmentStatus.APPROVED, AppointmentStatus.CONFIRMED] } } }),
      this.prisma.requirementSubmission.count({ where: { status: { in: [RequirementStatus.SUBMITTED, RequirementStatus.UNDER_REVIEW] } } }),
      this.prisma.clearance.count({ where: { status: ClearanceStatus.FOR_REVIEW } }),
      this.prisma.medicine.findMany({ where: { deletedAt: null }, include: { batches: true } }),
    ]);
    const lowStock = medicines.filter((medicine) => medicine.batches.reduce((total, batch) => total + batch.quantity, 0) <= medicine.reorderLevel).length;
    return { patients, visitsToday, visitsCompleted, appointmentsUpcoming, pendingRequirements, clearancesForReview, medicines: medicines.length, lowStock };
  }

  async operational(filters: ReportFiltersDto) {
    const range = this.resolveRange(filters);
    const domain = filters.domain ?? ReportDomain.ALL;
    const patient = filters.patientType ? { patient: { type: filters.patientType } } : {};
    const includeClinical = domain === ReportDomain.ALL || domain === ReportDomain.CLINICAL;
    const includeCompliance = domain === ReportDomain.ALL || domain === ReportDomain.COMPLIANCE;
    const includeInventory = domain === ReportDomain.ALL || domain === ReportDomain.INVENTORY;

    const [activePatients, clinical, compliance, inventory] = await Promise.all([
      this.prisma.patient.count({ where: { deletedAt: null, type: filters.patientType } }),
      includeClinical
        ? Promise.all([
            this.prisma.clinicVisit.count({ where: { ...patient, visitDate: range } }),
            this.prisma.clinicVisit.count({ where: { ...patient, visitDate: range, status: VisitStatus.COMPLETED } }),
            this.prisma.appointment.count({ where: { ...patient, scheduledAt: range } }),
          ])
        : null,
      includeCompliance
        ? Promise.all([
            this.prisma.requirementSubmission.count({ where: { ...patient, submittedAt: range } }),
            this.prisma.requirementSubmission.count({ where: { ...patient, submittedAt: range, status: RequirementStatus.VERIFIED } }),
            this.prisma.clearance.count({ where: { ...patient, createdAt: range } }),
            this.prisma.clearance.count({ where: { ...patient, createdAt: range, status: ClearanceStatus.CLEARED } }),
          ])
        : null,
      includeInventory
        ? Promise.all([
            this.prisma.medicine.findMany({ where: { deletedAt: null }, select: { reorderLevel: true, batches: { select: { quantity: true } } } }),
            this.prisma.inventoryTransaction.count({ where: { createdAt: range } }),
          ])
        : null,
    ]);

    return {
      generatedAt: new Date().toISOString(),
      period: { from: range.gte.toISOString().slice(0, 10), to: new Date(range.lt.getTime() - 1).toISOString().slice(0, 10) },
      filters: { domain, patientType: filters.patientType ?? 'ALL' },
      activePatients,
      clinical: clinical ? { visits: clinical[0], completedVisits: clinical[1], appointments: clinical[2] } : null,
      compliance: compliance ? { evidenceSubmitted: compliance[0], evidenceVerified: compliance[1], clearancesRequested: compliance[2], clearancesIssued: compliance[3] } : null,
      inventory: inventory
        ? {
            medicines: inventory[0].length,
            lowStock: inventory[0].filter((medicine) => medicine.batches.reduce((sum, batch) => sum + batch.quantity, 0) <= medicine.reorderLevel).length,
            transactions: inventory[1],
          }
        : null,
    };
  }

  async exportCsv(filters: ReportFiltersDto, actorId: string) {
    const report = await this.operational(filters);
    const rows: Array<[string, string | number]> = [
      ['Period from', report.period.from],
      ['Period to', report.period.to],
      ['Domain', report.filters.domain],
      ['Patient type', report.filters.patientType],
      ['Active patients', report.activePatients],
    ];
    if (report.clinical) rows.push(['Visits', report.clinical.visits], ['Completed visits', report.clinical.completedVisits], ['Appointments', report.clinical.appointments]);
    if (report.compliance) rows.push(['Evidence submitted', report.compliance.evidenceSubmitted], ['Evidence verified', report.compliance.evidenceVerified], ['Clearances requested', report.compliance.clearancesRequested], ['Clearances issued', report.compliance.clearancesIssued]);
    if (report.inventory) rows.push(['Medicines', report.inventory.medicines], ['Low-stock medicines', report.inventory.lowStock], ['Inventory transactions', report.inventory.transactions]);
    const csv = ['Metric,Value', ...rows.map(([metric, value]) => `${this.csv(metric)},${this.csv(value)}`)].join('\r\n');
    await this.audit.record(actorId, AuditAction.EXPORT, 'Report', 'operational-summary', {
      metadata: { format: 'CSV', filters: report.filters, period: report.period, fields: rows.map(([metric]) => metric) },
    });
    return { csv, filename: `clinicka-operational-report-${report.period.from}-${report.period.to}.csv` };
  }

  private resolveRange(filters: ReportFiltersDto) {
    const now = new Date();
    const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const from = filters.from ? new Date(`${filters.from.slice(0, 10)}T00:00:00.000Z`) : defaultFrom;
    const inclusiveTo = filters.to ? new Date(`${filters.to.slice(0, 10)}T00:00:00.000Z`) : now;
    const to = new Date(inclusiveTo);
    to.setUTCDate(to.getUTCDate() + 1);
    if (from >= to) throw new BadRequestException('The report start date must be on or before the end date.');
    if (to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) throw new BadRequestException('Report periods cannot exceed 366 days.');
    return { gte: from, lt: to };
  }

  private csv(value: string | number) {
    return `"${String(value).replace(/"/g, '""')}"`;
  }
}
