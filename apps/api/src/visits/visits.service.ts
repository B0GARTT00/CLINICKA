import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { VisitStatus, AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultationDto, CreateVisitDto, CreateVitalSignDto } from './dto';

const PERMITTED_STATUS_TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
  [VisitStatus.OPEN]: [VisitStatus.IN_CONSULTATION, VisitStatus.CANCELLED],
  [VisitStatus.IN_CONSULTATION]: [VisitStatus.COMPLETED, VisitStatus.CANCELLED],
  [VisitStatus.COMPLETED]: [],
  [VisitStatus.CANCELLED]: [],
};

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
    const activeVisit = await this.prisma.clinicVisit.findFirst({
      where: {
        patientId: patient.id,
        visitDate: { gte: start, lt: end },
        status: { in: [VisitStatus.OPEN, VisitStatus.IN_CONSULTATION] },
      },
    });
    if (activeVisit) {
      throw new ConflictException('This patient already has an active visit in today\'s clinic queue.');
    }

    const visit = await this.prisma.clinicVisit.create({
      data: { ...dto, patientId: patient.id },
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
      include: { patient: true, vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 1 } },
      orderBy: { visitDate: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.clinicVisit.findUnique({
      where: { id },
      include: {
        patient: true,
        vitalSigns: { orderBy: { recordedAt: 'desc' } },
        consultations: { include: { diagnoses: true, treatments: true, prescriptions: { include: { items: true } } } },
      },
    });
  }

  async addVitalSigns(id: string, dto: CreateVitalSignDto, actorId: string) {
    const visit = await this.ensureVisit(id);
    this.ensureClinicalEntryAllowed(visit.status);
    if (!Object.values(dto).some((value) => value !== undefined && value !== null)) {
      throw new UnprocessableEntityException('Record at least one vital-sign observation.');
    }
    if (
      dto.systolicBp !== undefined &&
      dto.diastolicBp !== undefined &&
      dto.systolicBp <= dto.diastolicBp
    ) {
      throw new UnprocessableEntityException('Systolic BP must be higher than diastolic BP.');
    }
    const vitalSigns = await this.prisma.vitalSign.create({
      data: { clinicVisitId: id, recordedById: actorId, ...dto },
    });
    await this.audit(actorId, AuditAction.VISIT_VITAL_SIGNS_RECORDED, id);
    return vitalSigns;
  }

  async updateStatus(id: string, status: VisitStatus, actorId: string) {
    const visit = await this.ensureVisit(id);
    if (visit.status === status) {
      throw new UnprocessableEntityException(`Visit is already ${status}.`);
    }
    if (!PERMITTED_STATUS_TRANSITIONS[visit.status].includes(status)) {
      throw new UnprocessableEntityException(
        `Invalid visit transition from ${visit.status} to ${status}.`,
      );
    }
    if (status === VisitStatus.COMPLETED) {
      const [vitalSigns, consultations] = await Promise.all([
        this.prisma.vitalSign.count({ where: { clinicVisitId: id } }),
        this.prisma.consultation.count({ where: { clinicVisitId: id } }),
      ]);
      if (!vitalSigns || !consultations) {
        throw new UnprocessableEntityException(
          'A visit requires at least one vital-sign record and one consultation before completion.',
        );
      }
    }
    const updatedVisit = await this.prisma.clinicVisit.update({ where: { id }, data: { status } });
    const statusAction = `VISIT_STATUS_${status}` as AuditAction;
    await this.audit(actorId, statusAction, id, {
      event: 'VISIT_STATUS_TRANSITION',
      from: visit.status,
      to: status,
    });
    return updatedVisit;
  }

  async addConsultation(id: string, dto: CreateConsultationDto, clinicianId: string) {
    const visit = await this.ensureVisit(id);
    this.ensureClinicalEntryAllowed(visit.status);
    if (!this.hasConsultationContent(dto)) {
      throw new UnprocessableEntityException('Record at least one clinical consultation finding or intervention.');
    }
    const consultation = await this.prisma.consultation.create({
      data: {
        clinicVisitId: id,
        clinicianId,
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
        cues: dto.cues,
        nursingDiagnosis: dto.nursingDiagnosis,
        nursingIntervention: dto.nursingIntervention,
        medicalDiagnosis: dto.medicalDiagnosis,
        medicalIntervention: dto.medicalIntervention,
        evaluation: dto.evaluation,
        diagnoses: dto.diagnoses ? { create: dto.diagnoses } : undefined,
        treatments: dto.treatments ? { create: dto.treatments } : undefined,
        prescriptions: dto.prescriptionItems?.length
          ? { create: { instructions: dto.prescriptionInstructions, items: { create: dto.prescriptionItems } } }
          : undefined,
      },
      include: { diagnoses: true, treatments: true, prescriptions: { include: { items: true } } },
    });
    if (visit.status !== VisitStatus.IN_CONSULTATION) {
      await this.prisma.clinicVisit.update({ where: { id }, data: { status: VisitStatus.IN_CONSULTATION } });
      await this.audit(clinicianId, AuditAction.VISIT_STATUS_IN_CONSULTATION, id, {
        event: 'VISIT_STATUS_TRANSITION',
        from: visit.status,
        to: VisitStatus.IN_CONSULTATION,
      });
    }
    await this.audit(clinicianId, AuditAction.VISIT_CONSULTATION_RECORDED, id);
    return consultation;
  }

  private async ensureVisit(id: string) {
    const visit = await this.prisma.clinicVisit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('Clinic visit not found.');
    return visit;
  }

  private ensureClinicalEntryAllowed(status: VisitStatus) {
    if (status === VisitStatus.COMPLETED || status === VisitStatus.CANCELLED) {
      throw new UnprocessableEntityException(
        `Clinical entries cannot be added to a ${status.toLowerCase()} visit.`,
      );
    }
  }

  private hasConsultationContent(dto: CreateConsultationDto) {
    const narrativeFields = [
      dto.cues,
      dto.nursingDiagnosis,
      dto.nursingIntervention,
      dto.medicalDiagnosis,
      dto.medicalIntervention,
      dto.evaluation,
      dto.subjective,
      dto.objective,
      dto.assessment,
      dto.plan,
      dto.prescriptionInstructions,
    ];
    return (
      narrativeFields.some((value) => Boolean(value?.trim())) ||
      Boolean(dto.diagnoses?.length || dto.treatments?.length || dto.prescriptionItems?.length)
    );
  }

  private audit(
    actorId: string,
    action: AuditAction,
    visitId: string,
    metadata?: Record<string, string>,
  ) {
    return this.prisma.auditLog.create({
      data: { actorId, action, entity: 'ClinicVisit', entityId: visitId, metadata },
    });
  }
}
