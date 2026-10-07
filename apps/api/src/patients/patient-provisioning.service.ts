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

    const profile = user.registrationProfile && typeof user.registrationProfile === 'object' && !Array.isArray(user.registrationProfile)
      ? user.registrationProfile as { studentId?: string; employeeId?: string; departmentId?: string; programId?: string; yearLevel?: number; section?: string }
      : {};
    if (!profile.departmentId) throw new ConflictException('Registration is missing a department.');
    const department = await tx.department.findUnique({
      where: { id: profile.departmentId },
      include: { programs: { select: { id: true } } },
    });
    if (!department) throw new ConflictException('Registration department was not found.');
    let program: { id: string; name: string; departmentId: string } | null = null;
    if (patientType === 'STUDENT') {
      if (!profile.studentId || !profile.yearLevel) {
        throw new ConflictException('Student registration is missing an academic affiliation.');
      }
      if (department.programs.length && !profile.programId) {
        throw new ConflictException('Student registration is missing its program.');
      }
      program = profile.programId ? await tx.program.findUnique({ where: { id: profile.programId } }) : null;
      if (profile.programId && (!program || program.departmentId !== profile.departmentId)) {
        throw new ConflictException('Student program and department do not match.');
      }
    } else if (!profile.employeeId) {
      throw new ConflictException('Registration is missing an Employee ID.');
    }

    // Email ownership was established by verification. Student ID provides a
    // second identity signal for manually entered records that have no email.
    const emailMatch = await tx.patient.findUnique({
      where: { email: user.email },
      include: { user: { select: { id: true } }, studentProfile: true, employeeProfile: true },
    });
    const studentIdMatch = patientType === 'STUDENT' && profile.studentId
      ? await tx.studentProfile.findUnique({
          where: { studentId: profile.studentId },
          include: { patient: { include: { user: { select: { id: true } }, studentProfile: true, employeeProfile: true } } },
        })
      : null;
    const employeeIdMatch = patientType !== 'STUDENT' && profile.employeeId
      ? await tx.employeeProfile.findUnique({
          where: { employeeId: profile.employeeId },
          include: { patient: { include: { user: { select: { id: true } }, studentProfile: true, employeeProfile: true } } },
        })
      : null;
    if (emailMatch && studentIdMatch && emailMatch.id !== studentIdMatch.patient.id) {
      throw new ConflictException('The email and Student ID belong to different patient records. Clinic review is required.');
    }
    if (emailMatch && employeeIdMatch && emailMatch.id !== employeeIdMatch.patient.id) {
      throw new ConflictException('The email and Employee ID belong to different patient records. Clinic review is required.');
    }
    const existing = emailMatch ?? studentIdMatch?.patient ?? employeeIdMatch?.patient ?? null;
    if (existing) {
      if (existing.deletedAt || existing.type !== patientType || (existing.user && existing.user.id !== user.id)) {
        throw new ConflictException('A patient record needs clinic review before this account can be linked.');
      }
      if (existing.email && existing.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new ConflictException('The Student ID matches a patient record with a different email. Clinic review is required.');
      }
      if (patientType === 'STUDENT' && existing.studentProfile?.studentId && existing.studentProfile.studentId !== profile.studentId) {
        throw new ConflictException('The email matches a patient record with a different Student ID. Clinic review is required.');
      }
      if (patientType !== 'STUDENT' && existing.employeeProfile?.employeeId && existing.employeeProfile.employeeId !== profile.employeeId) {
        throw new ConflictException('The email matches a patient record with a different Employee ID. Clinic review is required.');
      }
      await tx.patient.update({ where: { id: existing.id }, data: { email: user.email } });
      if (patientType === 'STUDENT') {
        await tx.studentProfile.upsert({
          where: { patientId: existing.id },
          update: { studentId: profile.studentId!, departmentId: department.id, programId: program?.id, program: program?.name ?? '', yearLevel: profile.yearLevel, section: profile.section },
          create: { patientId: existing.id, studentId: profile.studentId!, departmentId: department.id, programId: program?.id, program: program?.name ?? '', yearLevel: profile.yearLevel, section: profile.section },
        });
      } else {
        await tx.employeeProfile.upsert({
          where: { patientId: existing.id },
          update: { employeeId: profile.employeeId!, departmentId: department.id, department: department.name },
          create: { patientId: existing.id, employeeId: profile.employeeId!, departmentId: department.id, department: department.name },
        });
      }
      await tx.user.update({ where: { id: user.id }, data: { patientId: existing.id, registrationProfile: Prisma.DbNull } });
      await tx.auditLog.create({ data: { actorId: user.id, action: AuditAction.OTHER, entity: 'Patient', entityId: existing.id, metadata: { event: 'PATIENT_LINKED', userId: user.id, matchedBy: emailMatch ? ((studentIdMatch || employeeIdMatch) ? 'EMAIL_AND_INSTITUTIONAL_ID' : 'EMAIL') : (studentIdMatch ? 'STUDENT_ID' : 'EMPLOYEE_ID') } } });
      return existing.id;
    }

    const name = splitDisplayName(user.displayName);
    const patient = await tx.patient.create({
      data: {
        patientNumber: await generatePatientNumber(tx), type: patientType, email: user.email, ...name,
        studentProfile: patientType === 'STUDENT' ? {
          create: {
            studentId: profile.studentId!,
            departmentId: profile.departmentId,
            programId: program?.id,
            program: program?.name ?? '',
            yearLevel: profile.yearLevel,
            section: profile.section,
          },
        } : undefined,
        employeeProfile: patientType !== 'STUDENT' && department ? {
          create: {
            employeeId: profile.employeeId!,
            departmentId: department.id,
            department: department.name,
          },
        } : undefined,
      },
    });
    await tx.user.update({ where: { id: user.id }, data: { patientId: patient.id, registrationProfile: Prisma.DbNull } });
    await tx.auditLog.create({ data: { actorId: user.id, action: AuditAction.CREATE, entity: 'Patient', entityId: patient.id, metadata: { event: 'PATIENT_AUTO_CREATED', userId: user.id } } });
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
