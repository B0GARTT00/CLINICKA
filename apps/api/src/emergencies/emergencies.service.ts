import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import { CreateEmergencyCaseDto } from './dto';

@Injectable()
export class EmergenciesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.emergencyCase.findMany({ include: { patient: true, clinicVisit: true }, orderBy: { occurredAt: 'desc' }, take: 100 });
  }

  async create(dto: CreateEmergencyCaseDto, actorId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { OR: [{ id: dto.patientId }, { patientNumber: dto.patientId }], deletedAt: null } });
    if (!patient) throw new NotFoundException('Active patient not found.');
    if (dto.clinicVisitId) {
      const visit = await this.prisma.clinicVisit.findUnique({ where: { id: dto.clinicVisitId } });
      if (!visit || visit.patientId !== patient.id) throw new NotFoundException('Clinic visit not found for this patient.');
    }
    const emergency = await this.prisma.emergencyCase.create({
      data: { ...dto, patientId: patient.id, clinicVisitId: dto.clinicVisitId, occurredAt: new Date(dto.occurredAt), attendedById: actorId },
      include: { patient: true, clinicVisit: true },
    });
    await this.prisma.auditLog.create({ data: { actorId, action: AuditAction.EMERGENCY_CASE_CREATED, entity: 'EmergencyCase', entityId: emergency.id } });
    return emergency;
  }
}
