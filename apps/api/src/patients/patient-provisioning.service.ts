import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generatePatientNumber, patientTypeForRoles, splitDisplayName } from './patient-identity';

type Transaction = Prisma.TransactionClient;

@Injectable()
export class PatientProvisioningService {
  constructor(private readonly prisma: PrismaService) {}

  async provision(tx: Transaction, userId: string): Promise<string | null> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('User not found.');
    const patientType = patientTypeForRoles(user.roles.map((entry) => entry.role.name), user.registrationProfile);
    if (!patientType) return null;
    if (user.patientId) {
      if (user.registrationProfile) await tx.user.update({ where: { id: user.id }, data: { registrationProfile: Prisma.DbNull } });
      return user.patientId;
    }

    // Email ownership was established by verification. An existing unlinked
    // manual record may be adopted, but a record linked to someone else may not.
    const existing = await tx.patient.findUnique({
      where: { email: user.email },
      include: { user: { select: { id: true } } },
    });
    if (existing) {
      if (existing.deletedAt || existing.type !== patientType || (existing.user && existing.user.id !== user.id)) {
        throw new ConflictException('A patient record needs clinic review before this account can be linked.');
      }
      await tx.user.update({ where: { id: user.id }, data: { patientId: existing.id, registrationProfile: Prisma.DbNull } });
      await tx.auditLog.create({ data: { actorId: user.id, action: AuditAction.OTHER, entity: 'Patient', entityId: existing.id, metadata: { event: 'PATIENT_LINKED', userId: user.id, patientNumber: existing.patientNumber } } });
      return existing.id;
    }

    const name = splitDisplayName(user.displayName);
    const patient = await tx.patient.create({
      data: { patientNumber: await generatePatientNumber(tx), type: patientType, email: user.email, ...name },
    });
    await tx.user.update({ where: { id: user.id }, data: { patientId: patient.id, registrationProfile: Prisma.DbNull } });
    await tx.auditLog.create({ data: { actorId: user.id, action: AuditAction.CREATE, entity: 'Patient', entityId: patient.id, metadata: { event: 'PATIENT_AUTO_CREATED', userId: user.id, patientNumber: patient.patientNumber } } });
    return patient.id;
  }

  async backfillUser(userId: string): Promise<'created' | 'linked' | 'skipped'> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
          if (!user || !user.emailVerifiedAt || user.patientId || !patientTypeForRoles(user.roles.map((entry) => entry.role.name), user.registrationProfile)) return 'skipped';
          const existing = await tx.patient.findUnique({ where: { email: user.email }, select: { id: true } });
          await this.provision(tx, user.id);
          return existing ? 'linked' : 'created';
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code) && attempt < 2) continue;
        throw error;
      }
    }
    return 'skipped';
  }
}
