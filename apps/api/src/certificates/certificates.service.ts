import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, CertificateType, NotificationType, Prisma } from '@prisma/client';
import { CreateCertificateDto } from './dto';

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const certificates = await this.prisma.medicalCertificate.findMany({ include: { patient: true, issuedBy: { select: { displayName: true } } }, orderBy: { issuedAt: 'desc' } });
    return certificates.map((certificate) => ({ ...certificate, certificateNumber: `CLN-${certificate.issuedAt.getFullYear()}-${certificate.id.slice(0, 8).toUpperCase()}` }));
  }

  async listMine(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { patientId: true } });
    if (!user?.patientId) return [];
    const certificates = await this.prisma.medicalCertificate.findMany({
      where: { patientId: user.patientId, sentAt: { not: null } },
      include: { patient: true, issuedBy: { select: { displayName: true } } },
      orderBy: { issuedAt: 'desc' },
    });
    return certificates.map((certificate) => ({ ...certificate, certificateNumber: `CLN-${certificate.issuedAt.getFullYear()}-${certificate.id.slice(0, 8).toUpperCase()}` }));
  }

  async create(dto: CreateCertificateDto, issuerId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { OR: [{ id: dto.patientId }, { patientNumber: dto.patientId }], deletedAt: null } });
    if (!patient) throw new NotFoundException('Active patient not found.');
    const certificate = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.medicalCertificate.create({ data: {
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
        lateMinutes: dto.lateMinutes, lateReason: dto.lateReason, specialCare: dto.specialCare,
        healthCounselling: dto.healthCounselling as Prisma.InputJsonValue | undefined,
        patientAcknowledgment: dto.patientAcknowledgment as Prisma.InputJsonValue | undefined,
        physicianSignedAt: dto.physicianSignedAt ? new Date(dto.physicianSignedAt) : undefined,
        formMetadata: dto.formMetadata as Prisma.InputJsonValue | undefined,
      },
      include: { patient: true, issuedBy: { select: { displayName: true } } },
      });
      return created;
    });
    await this.prisma.auditLog.create({ data: { actorId: issuerId, action: AuditAction.MEDICAL_CERTIFICATE_ISSUED, entity: 'MedicalCertificate', entityId: certificate.id } });
    return { ...certificate, certificateNumber: `CLN-${certificate.issuedAt.getFullYear()}-${certificate.id.slice(0, 8).toUpperCase()}` };
  }

  async send(id: string, senderId: string) {
    const certificate = await this.prisma.medicalCertificate.findUnique({
      where: { id },
      include: { patient: { include: { user: { select: { id: true } } } } },
    });
    if (!certificate) throw new NotFoundException('Certificate not found.');
    if (certificate.sentAt) throw new ConflictException('Certificate has already been sent to the patient.');
    if (!certificate.patient.user?.id) throw new BadRequestException('The patient does not have a linked portal account.');
    const sentAt = new Date();
    const sent = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.medicalCertificate.update({
        where: { id }, data: { sentAt, sentById: senderId },
        include: { patient: true, issuedBy: { select: { displayName: true } } },
      });
      await transaction.notification.create({ data: {
        userId: certificate.patient.user!.id,
        title: 'Medical certificate available',
        body: `Your ${certificate.type.replaceAll('_', ' ').toLowerCase()} certificate is now available in your portal.`,
        type: NotificationType.OTHER,
        metadata: { href: '/my-certificates', entityId: certificate.id },
      } });
      return updated;
    });
    await this.prisma.auditLog.create({ data: { actorId: senderId, action: AuditAction.UPDATE, entity: 'MedicalCertificate', entityId: id, metadata: { event: 'MEDICAL_CERTIFICATE_SENT', sentAt: sentAt.toISOString() } } });
    return { ...sent, certificateNumber: `CLN-${sent.issuedAt.getFullYear()}-${sent.id.slice(0, 8).toUpperCase()}` };
  }
}
