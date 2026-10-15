import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReportFiltersDto } from './dto';

const DAY = 86_400_000;
const OFFSET = 8 * 60 * 60 * 1000;
const dateLabel = (date: Date) => new Date(date.getTime() + OFFSET).toISOString().slice(0, 10);
export function reportBucket(date: Date, grouping: 'WEEK' | 'MONTH') {
  const local = new Date(dateLabel(date) + 'T00:00:00Z');
  if (grouping === 'MONTH') return local.toISOString().slice(0, 7);
  local.setUTCDate(local.getUTCDate() - (local.getUTCDay() + 6) % 7);
  return local.toISOString().slice(0, 10);
}
export function ageAtVisit(birthDate: Date | null, visitDate: Date) {
  if (!birthDate) return null;
  const birth = birthDate.toISOString().slice(0, 10);
  const visit = dateLabel(visitDate);
  if (birth > visit) return null;
  return Number(visit.slice(0, 4)) - Number(birth.slice(0, 4)) - (visit.slice(5) < birth.slice(5) ? 1 : 0);
}

@Injectable()
export class ClinicReportsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async options() {
    const [departments, academicYears] = await Promise.all([
      this.prisma.department.findMany({ include: { programs: true }, orderBy: { name: 'asc' } }),
      this.prisma.academicYear.findMany({ include: { semesters: true }, orderBy: { startsAt: 'desc' } }),
    ]);
    return { departments, academicYears };
  }

  private patientWhere(filters: ReportFiltersDto): Prisma.PatientWhereInput {
    return {
      type: filters.patientType,
      ...(filters.departmentId ? { OR: [
        { studentProfile: { departmentId: filters.departmentId } },
        { employeeProfile: { departmentId: filters.departmentId } },
      ] } : {}),
      ...(filters.programId ? { studentProfile: { programId: filters.programId } } : {}),
    };
  }

  private async context(filters: ReportFiltersDto) {
    const today = dateLabel(new Date());
    const from = filters.from?.slice(0, 10) || today.slice(0, 7) + '-01';
    const to = filters.to?.slice(0, 10) || today;
    let start = new Date(from + 'T00:00:00+08:00');
    let end = new Date(new Date(to + 'T00:00:00+08:00').getTime() + DAY);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end || end.getTime() - start.getTime() > 366 * DAY) {
      throw new BadRequestException('Choose an ordered date range of at most 366 days.');
    }
    const year = filters.academicYearId ? await this.prisma.academicYear.findUnique({ where: { id: filters.academicYearId } }) : null;
    if (filters.academicYearId && !year) throw new NotFoundException('Academic year not found.');
    const semester = filters.semesterId ? await this.prisma.semester.findUnique({ where: { id: filters.semesterId } }) : null;
    if (filters.semesterId && !semester) throw new NotFoundException('Semester not found.');
    if (year && semester && semester.academicYearId !== year.id) throw new BadRequestException('Semester does not belong to the academic year.');
    for (const period of [year, semester]) {
      if (!period) continue;
      start = new Date(Math.max(start.getTime(), new Date(period.startsAt.toISOString().slice(0, 10) + 'T00:00:00+08:00').getTime()));
      end = new Date(Math.min(end.getTime(), new Date(period.endsAt.toISOString().slice(0, 10) + 'T00:00:00+08:00').getTime() + DAY));
    }
    // A non-overlapping period is an empty result, never a broader query.
    return { range: { gte: start, lt: end }, patient: this.patientWhere(filters), period: { from, to }, filters };
  }

  async utilization(filters: ReportFiltersDto) {
    const context = await this.context(filters);
    const visits = await this.prisma.clinicVisit.findMany({
      where: { visitDate: context.range, patient: context.patient },
      select: { patientId: true, visitDate: true, patient: { select: {
        type: true,
        studentProfile: { select: { department: { select: { id: true, name: true } }, programRef: { select: { id: true, name: true } }, program: true } },
        employeeProfile: { select: { departmentRef: { select: { id: true, name: true } }, department: true } },
      } } },
    });
    type Group = { id: string; label: string; visits: number; patients: Set<string> };
    const groups = { patientTypes: new Map<string, Group>(), departments: new Map<string, Group>(), programs: new Map<string, Group>(), weeks: new Map<string, Group>(), months: new Map<string, Group>() };
    const add = (map: Map<string, Group>, id: string, label: string, patientId: string) => {
      const row = map.get(id) || { id, label, visits: 0, patients: new Set<string>() };
      row.visits++; row.patients.add(patientId); map.set(id, row);
    };
    for (const type of ['STUDENT', 'FACULTY', 'STAFF']) groups.patientTypes.set(type, { id: type, label: type, visits: 0, patients: new Set<string>() });
    for (const visit of visits) {
      const student = visit.patient.studentProfile;
      const employee = visit.patient.employeeProfile;
      const department = student?.department || employee?.departmentRef;
      const program = student?.programRef;
      add(groups.patientTypes, visit.patient.type, visit.patient.type, visit.patientId);
      add(groups.departments, department?.id || employee?.department || 'UNASSIGNED', department?.name || employee?.department || 'Unassigned', visit.patientId);
      if (visit.patient.type === 'STUDENT') add(groups.programs, program?.id || student?.program || 'UNASSIGNED', program?.name || student?.program || 'Unassigned', visit.patientId);
      add(groups.weeks, reportBucket(visit.visitDate, 'WEEK'), reportBucket(visit.visitDate, 'WEEK'), visit.patientId);
      add(groups.months, reportBucket(visit.visitDate, 'MONTH'), reportBucket(visit.visitDate, 'MONTH'), visit.patientId);
    }
    return { period: context.period, totalVisits: visits.length, uniquePatients: new Set(visits.map(visit => visit.patientId)).size,
      ...Object.fromEntries(Object.entries(groups).map(([key, map]) => [key, [...map.values()].sort((a, b) => a.label.localeCompare(b.label)).map(row => ({ id: row.id, label: row.label, visits: row.visits, uniquePatients: row.patients.size }))])),
    };
  }

  async medicines(filters: ReportFiltersDto) {
    const context = await this.context(filters);
    const grouping = filters.grouping || 'WEEK';
    const items = await this.prisma.medicineDispensationItem.findMany({
      where: { dispensation: { createdAt: context.range, patient: context.patient } },
      select: { quantity: true, dispensationId: true, dispensation: { select: { createdAt: true } }, medicineBatch: { select: { medicine: { select: { id: true, name: true, unit: true } } } } },
    });
    const rows = new Map<string, { id: string; period: string; medicine: string; unit: string; quantity: number; transactions: Set<string> }>();
    for (const item of items) {
      const period = reportBucket(item.dispensation.createdAt, grouping);
      const medicine = item.medicineBatch.medicine;
      const id = period + ':' + medicine.id;
      const row = rows.get(id) || { id, period, medicine: medicine.name, unit: medicine.unit, quantity: 0, transactions: new Set<string>() };
      row.quantity += item.quantity; row.transactions.add(item.dispensationId); rows.set(id, row);
    }
    return { period: context.period, grouping, rows: [...rows.values()].sort((a, b) => a.period.localeCompare(b.period) || a.medicine.localeCompare(b.medicine)).map(row => ({ ...row, transactions: row.transactions.size })) };
  }

  async logbook(filters: ReportFiltersDto) {
    const context = await this.context(filters);
    const page = filters.page || 1, limit = filters.limit || 25;
    const where = { visitDate: context.range, patient: context.patient };
    const [total, visits] = await Promise.all([
      this.prisma.clinicVisit.count({ where }),
      this.prisma.clinicVisit.findMany({ where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ visitDate: 'desc' }, { id: 'asc' }],
        select: { id: true, visitDate: true, notes: true,
          patient: { select: { firstName: true, middleName: true, lastName: true, sex: true, birthDate: true, studentProfile: { select: { program: true } }, employeeProfile: { select: { position: true } } } },
          consultations: { orderBy: { createdAt: 'asc' }, select: { medicalDiagnosis: true, nursingDiagnosis: true, assessment: true, medicalIntervention: true, nursingIntervention: true, plan: true, evaluation: true,
            diagnoses: { select: { description: true } }, treatments: { select: { description: true, notes: true } },
            prescriptions: { select: { instructions: true, items: { select: { medicineName: true, dosage: true, frequency: true, duration: true, quantity: true } } } },
          } },
        },
      }),
    ]);
    const join = (values: (string | null | undefined)[]) => [...new Set(values.filter(Boolean))].join('\n');
    return { period: context.period, page, limit, total, rows: visits.map(visit => ({
      id: visit.id, date: dateLabel(visit.visitDate), patient: join([[visit.patient.firstName, visit.patient.middleName, visit.patient.lastName].filter(Boolean).join(' ')]),
      gender: visit.patient.sex || '', age: ageAtVisit(visit.patient.birthDate, visit.visitDate), positionCourse: visit.patient.studentProfile?.program || visit.patient.employeeProfile?.position || '',
      diagnosis: join(visit.consultations.flatMap(note => [note.medicalDiagnosis, note.nursingDiagnosis, note.assessment, ...note.diagnoses.map(item => item.description)])),
      medicalOrders: join(visit.consultations.flatMap(note => [note.medicalIntervention, note.nursingIntervention, ...note.treatments.map(item => join([item.description, item.notes])), ...note.prescriptions.flatMap(rx => [rx.instructions, ...rx.items.map(item => [item.medicineName, item.dosage, item.frequency, item.duration, item.quantity == null ? '' : `Quantity: ${item.quantity}`].filter(Boolean).join(' · '))])])),
      remarksFollowUp: join([visit.notes, ...visit.consultations.flatMap(note => [note.plan, note.evaluation])]),
    })) };
  }

  async exportCsv(kind: 'utilization' | 'medicines' | 'logbook', filters: ReportFiltersDto, actorId: string) {
    let rows: Record<string, unknown>[];
    if (kind === 'logbook') {
      // Bounded export: never silently truncate a sensitive report.
      const first = await this.logbook({ ...filters, page: 1, limit: 100 });
      if (first.total > 5000) throw new BadRequestException('Narrow the date range to at most 5,000 logbook visits.');
      rows = first.rows;
      for (let page = 2; page <= Math.ceil(first.total / 100); page++) rows.push(...(await this.logbook({ ...filters, page, limit: 100 })).rows);
    } else if (kind === 'medicines') rows = (await this.medicines(filters)).rows;
    else {
      const report = await this.utilization(filters);
      rows = [{ section: 'Totals', label: 'Selected period', visits: report.totalVisits, uniquePatients: report.uniquePatients }];
      for (const key of ['patientTypes', 'departments', 'programs', 'weeks', 'months']) {
        const groups = (report as unknown as Record<string, { label: string; visits: number; uniquePatients: number }[]>)[key];
        rows.push(...groups.map(row => ({ section: key, label: row.label, visits: row.visits, uniquePatients: row.uniquePatients })));
      }
    }
    const headers = kind === 'logbook' ? ['date', 'patient', 'gender', 'age', 'positionCourse', 'diagnosis', 'medicalOrders', 'remarksFollowUp']
      : kind === 'medicines' ? ['period', 'medicine', 'unit', 'quantity', 'transactions'] : ['section', 'label', 'visits', 'uniquePatients'];
    const cell = (value: unknown) => { const raw = String(value ?? ''); return '"' + (/^[\s]*[=+@-]/.test(raw) ? "'" + raw : raw).replace(/"/g, '""') + '"'; };
    const csv = ['Selected period,' + cell(filters.from || '') + ',' + cell(filters.to || ''), headers.map(cell).join(','), ...rows.map(row => headers.map(key => cell(row[key])).join(','))].join('\r\n');
    await this.audit.record(actorId, AuditAction.EXPORT, 'Report', 'clinic-' + kind, { metadata: { format: 'CSV', filters: { ...filters }, rowCount: rows.length, fields: headers } });
    return { csv, filename: `clinicka-${kind}.csv` };
  }
}
