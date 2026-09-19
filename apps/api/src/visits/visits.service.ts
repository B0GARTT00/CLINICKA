import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { VisitStatus, AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultationDto, CreateVisitDto, CreateVitalSignDto } from './dto';

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
    await this.ensureVisit(id);
    const vitalSigns = await this.prisma.vitalSign.create({
      data: { clinicVisitId: id, recordedById: actorId, ...dto },
    });
    await this.audit(actorId, AuditAction.VISIT_VITAL_SIGNS_RECORDED, id);
    return vitalSigns;
  }

  async updateStatus(id: string, status: VisitStatus, actorId: string) {
    await this.ensureVisit(id);
    if (status === VisitStatus.OPEN) {
      throw new UnprocessableEntityException('A visit cannot return to the open queue.');
    }
    const visit = await this.prisma.clinicVisit.update({ where: { id }, data: { status } });
    const statusAction = `VISIT_STATUS_${status}` as AuditAction;
    await this.audit(actorId, statusAction, id);
    return visit;
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
    }
    await this.audit(clinicianId, AuditAction.VISIT_CONSULTATION_RECORDED, id);
    return consultation;
  }

  private async ensureVisit(id: string) {
    const visit = await this.prisma.clinicVisit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('Clinic visit not found.');
    return visit;
  }

  private audit(actorId: string, action: AuditAction, visitId: string) {
    return this.prisma.auditLog.create({
      data: { actorId, action, entity: 'ClinicVisit', entityId: visitId },
    });
  }
}
