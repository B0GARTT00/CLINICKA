import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, VisitStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { VisitStateMachine } from './state-machine/visit-state-machine';
import { isPermittedTransition } from './state-machine/visit-transitions';
import { InvalidVisitTransitionException } from './state-machine/visit-state-machine.exceptions';
import { CreateConsultationDto, CreateVitalSignDto, CreateVisitDto } from './dto';

@Injectable()
export class VisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly stateMachine: VisitStateMachine,
  ) {}

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

    await this.audit.record(actorId, AuditAction.VISIT_CREATED, 'ClinicVisit', visit.id);
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
    await this.audit.record(actorId, AuditAction.VISIT_VITAL_SIGNS_RECORDED, 'ClinicVisit', id);
    return vitalSigns;
  }

  /**
   * Update the visit status through the state machine.
   *
   * All status changes funnel through `VisitStateMachine.transition`, which
   * enforces the canonical transition table, validates completion
   * prerequisites, and records an immutable audit entry.
   *
   * Returns the updated visit augmented with transition metadata so callers
   * (controllers, the web UI) can surface the previous/new status.
   */
  async updateStatus(id: string, status: VisitStatus, actorId: string) {
    const result = await this.stateMachine.transition(id, status, actorId);
    return this.toVisitResponse(result);
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

    // Recording a consultation may advance the visit into IN_CONSULTATION.
    // This is a state transition and must be validated + audited as one.
    if (visit.status !== VisitStatus.IN_CONSULTATION) {
      if (!isPermittedTransition(visit.status, VisitStatus.IN_CONSULTATION)) {
        throw new InvalidVisitTransitionException(visit.status, VisitStatus.IN_CONSULTATION);
      }
      await this.prisma.clinicVisit.update({
        where: { id },
        data: { status: VisitStatus.IN_CONSULTATION, clinicianId },
      });
      await this.audit.recordStatusTransition(
        clinicianId,
        id,
        AuditAction.VISIT_STATUS_IN_CONSULTATION,
        visit.status,
        VisitStatus.IN_CONSULTATION,
      );
    }

    await this.audit.record(clinicianId, AuditAction.VISIT_CONSULTATION_RECORDED, 'ClinicVisit', id);
    return consultation;
  }

  /**
   * Mark a visit as completed.
   *
   * Delegated to the state machine, which enforces:
   *   - the visit must currently be IN_CONSULTATION (not OPEN, not terminal),
   *   - at least one vital-signs record exists, and
   *   - at least one consultation note exists.
   */
  async complete(id: string, actorId: string) {
    const result = await this.stateMachine.complete(id, actorId);
    return this.toVisitResponse(result);
  }

  /**
   * Returns the permitted target statuses for a given state. Useful for UI
   * controls that want to grey-out disallowed actions.
   */
  getPermittedTargets(current: VisitStatus) {
    return this.stateMachine.getPermittedTargets(current);
  }

  private toVisitResponse(result: {
    visit: { id: string; status: VisitStatus };
    previousStatus: VisitStatus;
    nextStatus: VisitStatus;
    timestamp: Date;
  }) {
    return result;
  }

  private async ensureVisit(id: string) {
    const visit = await this.prisma.clinicVisit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('Clinic visit not found.');
    return visit;
  }
}