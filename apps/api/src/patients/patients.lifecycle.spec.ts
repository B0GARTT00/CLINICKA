import { BadRequestException, ConflictException } from '@nestjs/common';
import { ArchiveStatus, PatientType } from '@prisma/client';
import { PatientsService } from './patients.service';

describe('PatientsService lifecycle controls', () => {
  const prisma = {
    patient: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
    user: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    patientHealthRecord: { upsert: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new PatientsService(prisma as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.auditLog.create.mockResolvedValue({});
    prisma.$transaction.mockImplementation((operation: (client: typeof prisma) => unknown) => operation(prisma));
  });

  it('excludes archived records from the default active-care patient list', async () => {
    prisma.patient.findMany.mockResolvedValue([]);
    await service.findAll();
    expect(prisma.patient.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ deletedAt: null, archiveStatus: ArchiveStatus.ACTIVE }),
    }));
  });

  it('archives the existing record without deleting clinical history', async () => {
    prisma.patient.findUnique.mockResolvedValue({ id: 'patient-1', deletedAt: null, archiveStatus: ArchiveStatus.ACTIVE, visits: [{ id: 'visit-1' }] });
    prisma.patient.update.mockResolvedValue({ id: 'patient-1', archiveStatus: ArchiveStatus.ARCHIVED });
    await service.remove('patient-1', 'staff-1');
    expect(prisma.patient.update).toHaveBeenCalledWith({ where: { id: 'patient-1' }, data: { deletedAt: expect.any(Date), archiveStatus: ArchiveStatus.ARCHIVED } });
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  it('restores the same patient ID, preserving related clinical records', async () => {
    prisma.patient.findUnique.mockResolvedValue({ id: 'patient-1', deletedAt: new Date(), archiveStatus: ArchiveStatus.ARCHIVED, visits: [{ id: 'visit-1' }] });
    prisma.patient.update.mockResolvedValue({ id: 'patient-1', archiveStatus: ArchiveStatus.ACTIVE, visits: [{ id: 'visit-1' }] });
    const restored = await service.restore('patient-1', 'staff-1');
    expect(prisma.patient.update).toHaveBeenCalledWith({ where: { id: 'patient-1' }, data: { deletedAt: null, archiveStatus: ArchiveStatus.ACTIVE } });
    expect(restored.id).toBe('patient-1');
  });

  it('returns a clear conflict for a duplicate student identifier', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'existing-patient' });
    await expect(service.create({ type: PatientType.STUDENT, firstName: 'Ana', lastName: 'Santos', studentId: 'STU-2026-001' }, 'staff-1')).rejects.toThrow("Student ID 'STU-2026-001' is already assigned");
  });

  it('blocks active-care profile changes while a patient is archived', async () => {
    prisma.patient.findUnique.mockResolvedValue({ id: 'patient-1', deletedAt: new Date(), archiveStatus: ArchiveStatus.ARCHIVED });
    await expect(service.updateHealthRecord('patient-1', {}, 'staff-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.patientHealthRecord.upsert).not.toHaveBeenCalled();
  });

  it('rejects repeated archive and restore transitions clearly', async () => {
    prisma.patient.findUnique.mockResolvedValueOnce({ id: 'patient-1', deletedAt: new Date(), archiveStatus: ArchiveStatus.ARCHIVED });
    await expect(service.remove('patient-1', 'staff-1')).rejects.toBeInstanceOf(ConflictException);
    prisma.patient.findUnique.mockResolvedValueOnce({ id: 'patient-1', deletedAt: null, archiveStatus: ArchiveStatus.ACTIVE });
    await expect(service.restore('patient-1', 'staff-1')).rejects.toBeInstanceOf(ConflictException);
  });
});
