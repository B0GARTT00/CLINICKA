import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ArchiveStatus, PatientType, Prisma, AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { generatePatientNumber } from './patient-identity';
import {
  CreateAllergyDto,
  CreateDocumentDto,
  CreateEmergencyContactDto,
  CreateMedicalConditionDto,
  CreateMedicalHistoryDto,
  CreatePatientDto,
  UpdatePatientDto,
  UpdatePatientHealthRecordDto,
} from './dto';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
  ) {}

  async create(dto: CreatePatientDto, actorId?: string) {
    const { program, yearLevel, department, studentId, employeeId, ...patientData } = dto;
    if (studentId && dto.type !== PatientType.STUDENT) throw new ConflictException('Student ID requires a student patient type.');
    if (employeeId && dto.type === PatientType.STUDENT) throw new ConflictException('Employee ID requires a faculty or staff patient type.');
    if (dto.type === PatientType.STUDENT && (program || yearLevel) && !studentId) throw new BadRequestException('Student ID is required to add a student profile.');
    if (dto.type !== PatientType.STUDENT && department && !employeeId) throw new BadRequestException('Employee ID is required to add an employee profile.');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const possibleMatch = await tx.patient.findFirst({
            where: { OR: [
              ...(dto.email ? [{ email: dto.email }] : []),
              ...(studentId ? [{ studentProfile: { studentId } }] : []),
              ...(employeeId ? [{ employeeProfile: { employeeId } }] : []),
            ] },
            select: { id: true },
          });
          if (possibleMatch) throw new ConflictException(this.duplicateMessage(dto.email, studentId, employeeId));
          if (dto.email && await tx.user.findUnique({ where: { email: dto.email }, select: { id: true } })) {
            throw new ConflictException('An account already uses this email. Review the account before adding a patient manually.');
          }
          const patient = await tx.patient.create({
            data: {
              ...patientData,
              patientNumber: await generatePatientNumber(tx),
              studentProfile: dto.type === PatientType.STUDENT && studentId ? { create: { studentId, program: program ?? '', yearLevel } } : undefined,
              employeeProfile: dto.type !== PatientType.STUDENT && employeeId ? { create: { employeeId, department: department ?? '' } } : undefined,
            },
          });
          if (actorId) await tx.auditLog.create({ data: { actorId, action: AuditAction.CREATE, entity: 'Patient', entityId: patient.id, metadata: { event: 'PATIENT_MANUAL_CREATED', patientNumber: patient.patientNumber } } });
          return patient;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code) && attempt < 2) continue;
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException(this.duplicateMessage(dto.email, studentId, employeeId));
        throw error;
      }
    }
    throw new ConflictException('Patient registration could not be completed. Please try again.');
  }

  async update(id: string, dto: UpdatePatientDto, actorId?: string) {
    try {
      const { program, yearLevel, department, studentId, employeeId, ...patientData } = dto;
      const existing = await this.prisma.patient.findUnique({ where: { id }, include: { studentProfile: true, employeeProfile: true } });
      if (!existing) throw new NotFoundException('Patient not found.');
      const type = dto.type ?? existing.type;
      if (type === PatientType.STUDENT && (program !== undefined || yearLevel !== undefined) && !studentId && !existing.studentProfile) throw new BadRequestException('Student ID is required to add a student profile.');
      if (type !== PatientType.STUDENT && department !== undefined && !employeeId && !existing.employeeProfile) throw new BadRequestException('Employee ID is required to add an employee profile.');
      const duplicate = await this.prisma.patient.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(dto.email ? [{ email: dto.email }] : []),
            ...(studentId ? [{ studentProfile: { studentId } }] : []),
            ...(employeeId ? [{ employeeProfile: { employeeId } }] : []),
          ],
        },
        select: { id: true },
      });
      if (duplicate) throw new ConflictException(this.duplicateMessage(dto.email, studentId, employeeId));
      return await this.prisma.$transaction(async (transaction) => {
        await transaction.patient.update({ where: { id }, data: patientData });
        if (type === PatientType.STUDENT && (studentId || existing.studentProfile)) {
          await transaction.studentProfile.upsert({
            where: { patientId: id },
            update: { studentId: studentId ?? existing.studentProfile?.studentId, program: program ?? existing.studentProfile?.program ?? '', yearLevel },
            create: { patientId: id, studentId: studentId!, program: program ?? '', yearLevel },
          });
        }
        if (type !== PatientType.STUDENT && (employeeId || existing.employeeProfile)) {
          await transaction.employeeProfile.upsert({
            where: { patientId: id },
            update: { employeeId: employeeId ?? existing.employeeProfile?.employeeId, department: department ?? existing.employeeProfile?.department ?? '' },
            create: { patientId: id, employeeId: employeeId!, department: department ?? '' },
          });
        }
        if (actorId) await transaction.auditLog.create({ data: { actorId, action: AuditAction.UPDATE, entity: 'Patient', entityId: id, metadata: { changedFields: Object.keys(dto) } } });
        return transaction.patient.findUnique({ where: { id }, include: { studentProfile: true, employeeProfile: true } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(this.duplicateMessage(dto.email, dto.studentId, dto.employeeId));
      }
      throw error;
    }
  }

  async remove(id: string, actorId: string) {
    const existing = await this.ensureExists(id);
    if (existing.deletedAt || existing.archiveStatus === ArchiveStatus.ARCHIVED) throw new ConflictException('Patient is already archived.');
    const patient = await this.prisma.patient.update({ where: { id }, data: { deletedAt: new Date(), archiveStatus: ArchiveStatus.ARCHIVED } });
    await this.audit(actorId, AuditAction.PATIENT_ARCHIVED, id);
    return patient;
  }

  async restore(id: string, actorId: string) {
    const existing = await this.ensureExists(id);
    if (!existing.deletedAt && existing.archiveStatus === ArchiveStatus.ACTIVE) throw new ConflictException('Patient is already active.');
    const patient = await this.prisma.patient.update({ where: { id }, data: { deletedAt: null, archiveStatus: ArchiveStatus.ACTIVE } });
    await this.audit(actorId, AuditAction.PATIENT_RESTORED, id);
    return patient;
  }

  addEmergencyContact(patientId: string, dto: CreateEmergencyContactDto, actorId: string) {
    return this.createRelated(patientId, actorId, AuditAction.PATIENT_EMERGENCY_CONTACT_ADDED, () =>
      this.prisma.emergencyContact.create({ data: { patientId, ...dto } }),
    );
  }

  addMedicalHistory(patientId: string, dto: CreateMedicalHistoryDto, actorId: string) {
    return this.createRelated(patientId, actorId, AuditAction.PATIENT_HISTORY_ADDED, () =>
      this.prisma.medicalHistory.create({ data: { patientId, ...dto } }),
    );
  }

  addCondition(patientId: string, dto: CreateMedicalConditionDto, actorId: string) {
    return this.createRelated(patientId, actorId, AuditAction.PATIENT_CONDITION_ADDED, () =>
      this.prisma.medicalCondition.create({
        data: {
          patientId,
          ...dto,
          diagnosedAt: dto.diagnosedAt ? new Date(dto.diagnosedAt) : undefined,
          resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : undefined,
        },
      }),
    );
  }

  addAllergy(patientId: string, dto: CreateAllergyDto, actorId: string) {
    return this.createRelated(patientId, actorId, AuditAction.PATIENT_ALLERGY_ADDED, () =>
      this.prisma.allergy.create({ data: { patientId, ...dto } }),
    );
  }

  async addDocument(patientId: string, dto: CreateDocumentDto, actorId: string) {
    await this.ensureActive(patientId);
    return this.documents.create(patientId, actorId, dto);
  }

  private async createRelated<T>(patientId: string, actorId: string, action: AuditAction, create: () => Promise<T>) {
    await this.ensureActive(patientId);
    const record = await create();
    await this.audit(actorId, action, patientId);
    return record;
  }

  private async ensureExists(id: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found.');
    return patient;
  }

  private async ensureActive(id: string) {
    const patient = await this.ensureExists(id);
    if (patient.deletedAt || patient.archiveStatus === ArchiveStatus.ARCHIVED) {
      throw new BadRequestException('Archived patients cannot receive active-care updates. Restore the patient first.');
    }
    return patient;
  }

  private duplicateMessage(email?: string, studentId?: string, employeeId?: string) {
    if (studentId) return `Student ID '${studentId}' is already assigned to another patient.`;
    if (employeeId) return `Employee ID '${employeeId}' is already assigned to another patient.`;
    if (email) return `Email '${email}' is already assigned to another patient or account.`;
    return 'A patient with these identity details already exists.';
  }

  private audit(actorId: string, action: AuditAction, patientId: string) {
    return this.prisma.auditLog.create({
      data: { actorId, action, entity: 'Patient', entityId: patientId },
    });
  }

  findAll(search?: string, page = 1, limit = 20, type?: PatientType, lifecycle: 'ACTIVE' | 'ARCHIVED' | 'ALL' = 'ACTIVE') {
    const where: Prisma.PatientWhereInput = {
      ...(lifecycle === 'ACTIVE' ? { deletedAt: null, archiveStatus: ArchiveStatus.ACTIVE } : lifecycle === 'ARCHIVED' ? { archiveStatus: ArchiveStatus.ARCHIVED } : {}),
      ...(type ? { type } : {}),
      ...(search
        ? {
            OR: [
              { patientNumber: { contains: search } },
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    return this.prisma.patient.findMany({
      where,
      include: {
        studentProfile: true,
        employeeProfile: true,
        user: { select: { id: true } },
        visits: { orderBy: { visitDate: 'desc' }, take: 1 },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  findOne(id: string) {
    return this.prisma.patient.findUnique({
      where: { id },
      include: {
        emergencyContacts: true,
        healthRecord: true,
        studentProfile: true,
        employeeProfile: true,
        allergies: true,
        conditions: true,
        medicalHistories: { orderBy: { recordedAt: 'desc' } },
        visits: { orderBy: { visitDate: 'desc' }, take: 5 },
      },
    });
  }

  async updateHealthRecord(patientId: string, dto: UpdatePatientHealthRecordDto, actorId: string) {
    // Persist the editable paper-form sections as one longitudinal patient record.
    await this.ensureActive(patientId);
    const data = {
      ...dto,
      pastMedicalHistory: dto.pastMedicalHistory as Prisma.InputJsonValue | undefined,
      obGyneHistory: dto.obGyneHistory as Prisma.InputJsonValue | undefined,
      familyHistory: dto.familyHistory as Prisma.InputJsonValue | undefined,
      psychosocialHistory: dto.psychosocialHistory as Prisma.InputJsonValue | undefined,
      physicalExamination: dto.physicalExamination as Prisma.InputJsonValue | undefined,
      laboratoryExaminations: dto.laboratoryExaminations as Prisma.InputJsonValue | undefined,
      updatedById: actorId,
    };
    const record = await this.prisma.patientHealthRecord.upsert({
      where: { patientId },
      update: data,
      create: { patientId, ...data },
    });
    await this.audit(actorId, AuditAction.UPDATE, patientId);
    return record;
  }

  async findOwn(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { patientId: true, emailVerifiedAt: true, status: true } });
    if (!user || user.status !== 'ACTIVE' || !user.emailVerifiedAt || !user.patientId) throw new NotFoundException('Patient profile not found.');
    const patient = await this.prisma.patient.findUnique({
      where: { id: user.patientId },
      include: { studentProfile: true, employeeProfile: true, allergies: true, conditions: true, emergencyContacts: true, visits: { orderBy: { visitDate: 'desc' }, take: 5 } },
    });
    if (!patient || patient.deletedAt) throw new NotFoundException('Patient profile not found.');
    return patient;
  }
}
