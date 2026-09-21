import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import { CreateScreeningDto, CreateVaccinationDto } from './dto';

@Injectable()
export class ScreeningsService {
  constructor(private readonly prisma: PrismaService) {}

  listVaccinations() {
    return this.prisma.vaccinationRecord.findMany({ include: { patient: true }, orderBy: { administeredAt: 'desc' }, take: 100 });
  }

  listScreenings() {
    return this.prisma.healthScreening.findMany({ include: { patient: true }, orderBy: { screenedAt: 'desc' }, take: 100 });
  }

  async createVaccination(dto: CreateVaccinationDto, actorId: string) {
    const patient = await this.findPatient(dto.patientId);
    const record = await this.prisma.vaccinationRecord.create({
      data: { ...dto, patientId: patient.id, administeredAt: new Date(dto.administeredAt), nextDoseAt: dto.nextDoseAt ? new Date(dto.nextDoseAt) : undefined },
      include: { patient: true },
    });
    await this.audit(actorId, AuditAction.VACCINATION_RECORDED, record.id);
    return record;
  }

  async createScreening(dto: CreateScreeningDto, actorId: string) {
    const patient = await this.findPatient(dto.patientId);
    const record = await this.prisma.healthScreening.create({
      data: { ...dto, patientId: patient.id, screenedAt: new Date(dto.screenedAt), screenedById: actorId },
      include: { patient: true },
    });
    await this.audit(actorId, AuditAction.HEALTH_SCREENING_RECORDED, record.id);
    return record;
  }

  private async findPatient(patientId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { OR: [{ id: patientId }, { patientNumber: patientId }], deletedAt: null } });
    if (!patient) throw new NotFoundException('Active patient not found.');
    return patient;
  }

  private audit(actorId: string, action: AuditAction, entityId: string) {
    return this.prisma.auditLog.create({ data: { actorId, action, entity: 'HealthRecord', entityId } });
  }
}
