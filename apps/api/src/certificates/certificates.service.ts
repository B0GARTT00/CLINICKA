import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, CertificateType, Prisma } from '@prisma/client';
import { CreateCertificateDto } from './dto';

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const certificates = await this.prisma.medicalCertificate.findMany({ include: { patient: true, issuedBy: { select: { displayName: true } } }, orderBy: { issuedAt: 'desc' } });
    return certificates.map((certificate) => ({ ...certificate, certificateNumber: `CLN-${certificate.issuedAt.getFullYear()}-${certificate.id.slice(0, 8).toUpperCase()}` }));
  }

  async create(dto: CreateCertificateDto, issuerId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { OR: [{ id: dto.patientId }, { patientNumber: dto.patientId }], deletedAt: null } });
    if (!patient) throw new NotFoundException('Active patient not found.');
    const certificate = await this.prisma.medicalCertificate.create({
      data: {
        patientId: patient.id, type: dto.type as CertificateType, purpose: dto.purpose,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined, issuedById: issuerId, remarks: dto.remarks,
        findings: dto.findings, fitnessStatus: dto.fitnessStatus, recommendations: dto.recommendations,
        followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : undefined, referredTo: dto.referredTo,
        confinementType: dto.confinementType,
        confinementFrom: dto.confinementFrom ? new Date(dto.confinementFrom) : undefined,
        confinementUntil: dto.confinementUntil ? new Date(dto.confinementUntil) : undefined,
        physicianName: dto.physicianName, physicianLicenseNo: dto.physicianLicenseNo,
        physicianPtrNo: dto.physicianPtrNo, physicianContact: dto.physicianContact,
        requiredImmunizations: dto.requiredImmunizations as Prisma.InputJsonValue | undefined,
      },
      include: { patient: true, issuedBy: { select: { displayName: true } } },
    });
    await this.prisma.auditLog.create({ data: { actorId: issuerId, action: AuditAction.MEDICAL_CERTIFICATE_ISSUED, entity: 'MedicalCertificate', entityId: certificate.id } });
    return { ...certificate, certificateNumber: `CLN-${certificate.issuedAt.getFullYear()}-${certificate.id.slice(0, 8).toUpperCase()}` };
  }
}
