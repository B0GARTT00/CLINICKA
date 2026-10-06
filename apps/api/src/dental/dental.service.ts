import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDentalRecordDto } from './dto';

@Injectable()
export class DentalService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.dentalRecord.findMany({
      include: { patient: true },
      orderBy: { examinedAt: 'desc' },
      take: 100,
    });
  }

  async create(dto: CreateDentalRecordDto, actorId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { OR: [{ id: dto.patientId }, { patientNumber: dto.patientId }], deletedAt: null },
    });
    if (!patient) throw new NotFoundException('Active patient not found.');

    const { examinedAt, waiverDueAt, waiverSignedAt, toothChart, formMetadata, ...fields } = dto;
    const record = await this.prisma.dentalRecord.create({
      data: {
        ...fields,
        patientId: patient.id,
        examinedAt: new Date(examinedAt),
        waiverDueAt: waiverDueAt ? new Date(waiverDueAt) : undefined,
        waiverSignedAt: waiverSignedAt ? new Date(waiverSignedAt) : undefined,
        toothChart: toothChart as Prisma.InputJsonValue | undefined,
        formMetadata: formMetadata as Prisma.InputJsonValue | undefined,
        recordedById: actorId,
      },
      include: { patient: true },
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: AuditAction.CREATE, entity: 'DentalRecord', entityId: record.id },
    });
    return record;
  }
}
