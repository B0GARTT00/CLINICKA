import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { VisitStatus, AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultationDto, CreateVitalSignDto, CreateVisitDto, UpdateVisitStatusDto } from './dto';

@Injectable()
export class VisitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVisitDto, actorId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: dto.patientId }, { patientNumber: dto.patientId }],
      },
    });
    if (!patient) throw new NotFoundException('Active patient not found.');

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const lastQueue = await this.prisma.clinicVisit.findFirst({
      where: {
        visitDate: { gte: start, lt: end },
        queueNumber: { not: null },
      },
      orderBy: { queueNumber: 'desc' },
    });

    const queueNumber = lastQueue && lastQueue.queueNumber ? lastQueue.queueNumber + 1 : 1;

    const visit = await this.prisma.clinicVisit.create({
      data: {
        patientId: patient.id,
        chiefComplaint: dto.chiefComplaint,
        notes: dto.notes,
        visitDate: dto.visitDate ? new Date(dto.visitDate) : undefined,
        queueNumber,
        status: VisitStatus.OPEN,
      },
      include: { patient: true },
    });

    await this.audit(actorId, AuditAction.VISIT_CREATED, visit.id);
    return visit;
  }

  listQueue() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.prisma.clinicVisit.findMany({
      where: {
        visitDate: { gte: start, lt: end },
        status: { in: [VisitStatus.OPEN, VisitStatus.IN_CONSULTATION] },
      },
      include: {
        patient: true,
        vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 1 },
        clinician: { select: { id: true, displayName: true } },
      },
      orderBy: { queueNumber: 'asc' },
    });
  }

  async findOne(id: string) {
    const visit = await this.prisma.clinicVisit.findUnique({
      where: { id },
      include: {
        patient: true,
        clinician: { select: { id: true, displayName: true } },
        vitalSigns: { orderBy: { recordedAt: 'desc' } },
        consultations: {
          include: {
            clinician: { select: { id: true, displayName: true } },
            diagnoses: true,
            treatments: true,
            prescriptions: { include: { items: true } },
          },
        },
        medicineDispensations: {
          include: {
            dispensedBy: { select: { id: true, displayName: true } },
            items: { include: { medicineBatch: { include: { medicine: true } } } },
          },
        },
      },
    });
    if (!visit) throw new NotFoundException('Clinic visit not found.');
    return visit;
  }

  async addVitalSigns(id: string, dto: CreateVitalSignDto, actorId: string) {
    await this.ensureVisit(id);
    const vitalSigns = await this.prisma.vitalSign.create({
      data: { clinicVisitId: id, recordedById: actorId, ...dto },
    });
    await this.audit(actorId, AuditAction.VISIT_VITAL_SIGNS_RECORDED, id);
    return vitalSigns;
  }

  async updateStatus(id: string, dto: UpdateVisitStatusDto, actorId: string) {
    const visit = await this.ensureVisit(id);
    const nextStatus = dto.status;

    if (!this.isValidTransition(visit.status, nextStatus)) {
      throw new UnprocessableEntityException(`Cannot transition visit from ${visit.status} to ${nextStatus}.`);
    }

    const updated = await this.prisma.clinicVisit.update({ where: { id }, data: { status: nextStatus } });

    const statusAction = this.mapStatusToAuditAction(nextStatus);
    if (statusAction) {
      await this.audit(actorId, statusAction, id);
    }

    return updated;
  }

  async addConsultation(id: string, dto: CreateConsultationDto, clinicianId: string) {
    const visit = await this.ensureVisit(id);

    const consultation = await this.prisma.consultation.create({
      data: {
        clinicVisitId: id,
        clinicianId,
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
        diagnoses: dto.diagnoses?.length ? { create: dto.diagnoses } : undefined,
        treatments: dto.treatments?.length ? { create: dto.treatments } : undefined,
        prescriptions: dto.prescriptionItems?.length
          ? {
              create: {
                instructions: dto.prescriptionInstructions,
                items: { create: dto.prescriptionItems },
              },
            }
          : undefined,
      },
      include: {
        diagnoses: true,
        treatments: true,
        prescriptions: { include: { items: true } },
      },
    });

    if (visit.status !== VisitStatus.IN_CONSULTATION) {
      await this.prisma.clinicVisit.update({ where: { id }, data: { status: VisitStatus.IN_CONSULTATION, clinicianId } });
    }

    await this.audit(clinicianId, AuditAction.VISIT_CONSULTATION_RECORDED, id);
    return consultation;
  }

  async complete(id: string, actorId: string) {
    const visit = await this.ensureVisit(id);

    if (visit.status === VisitStatus.COMPLETED) {
      throw new UnprocessableEntityException('Visit is already completed.');
    }

    if (visit.status === VisitStatus.CANCELLED) {
      throw new UnprocessableEntityException('Cannot complete a cancelled visit.');
    }

    const updated = await this.prisma.clinicVisit.update({
      where: { id },
      data: { status: VisitStatus.COMPLETED },
      include: {
        patient: true,
        clinician: { select: { id: true, displayName: true } },
        vitalSigns: { orderBy: { recordedAt: 'desc' } },
        consultations: {
          include: {
            diagnoses: true,
            treatments: true,
            prescriptions: { include: { items: true } },
          },
        },
        medicineDispensations: {
          include: {
            dispensedBy: { select: { id: true, displayName: true } },
            items: { include: { medicineBatch: { include: { medicine: true } } } },
          },
        },
      },
    });

    await this.audit(actorId, AuditAction.VISIT_STATUS_COMPLETED, id);
    return updated;
  }

  private async ensureVisit(id: string) {
    const visit = await this.prisma.clinicVisit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('Clinic visit not found.');
    return visit;
  }

  private isValidTransition(current: VisitStatus, next: VisitStatus): boolean {
    if (current === next) return true;

    const allowed: Record<VisitStatus, VisitStatus[]> = {
      [VisitStatus.OPEN]: [VisitStatus.IN_CONSULTATION, VisitStatus.CANCELLED],
      [VisitStatus.IN_CONSULTATION]: [VisitStatus.COMPLETED, VisitStatus.CANCELLED],
      [VisitStatus.COMPLETED]: [],
      [VisitStatus.CANCELLED]: [],
    };

    return allowed[current]?.includes(next) ?? false;
  }

  private mapStatusToAuditAction(status: VisitStatus): AuditAction | null {
    switch (status) {
      case VisitStatus.OPEN:
        return AuditAction.VISIT_STATUS_OPEN;
      case VisitStatus.IN_CONSULTATION:
        return AuditAction.VISIT_STATUS_IN_CONSULTATION;
      case VisitStatus.COMPLETED:
        return AuditAction.VISIT_STATUS_COMPLETED;
      case VisitStatus.CANCELLED:
        return AuditAction.VISIT_STATUS_CANCELLED;
      default:
        return null;
    }
  }

  private audit(actorId: string, action: AuditAction, visitId: string) {
    return this.prisma.auditLog.create({
      data: { actorId, action, entity: 'ClinicVisit', entityId: visitId },
    });
  }
}
