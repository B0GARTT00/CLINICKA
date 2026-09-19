import { ConflictException, NotFoundException } from '@nestjs/common';
import { VisitStatus } from '@prisma/client';
import { ROLES_KEY } from '../common/roles.decorator';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';

describe('VisitsService walk-in registration', () => {
  const prisma = {
    patient: { findFirst: jest.fn() },
    clinicVisit: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const service = new VisitsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an active patient walk-in that is included by the queue query', async () => {
    const patient = { id: 'patient-1', patientNumber: 'CLN-2026-00042' };
    const visit = {
      id: 'visit-1',
      patientId: patient.id,
      chiefComplaint: 'Headache',
      status: VisitStatus.OPEN,
      patient,
    };
    prisma.patient.findFirst.mockResolvedValue(patient);
    prisma.clinicVisit.findFirst.mockResolvedValue(null);
    prisma.clinicVisit.create.mockResolvedValue(visit);
    prisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.create({ patientId: patient.id, chiefComplaint: 'Headache', notes: 'Walk-in intake' }, 'staff-1'),
    ).resolves.toEqual(visit);
    expect(prisma.clinicVisit.create).toHaveBeenCalledWith({
      data: { patientId: patient.id, chiefComplaint: 'Headache', notes: 'Walk-in intake' },
      include: { patient: true },
    });

    await service.listQueue();
    expect(prisma.clinicVisit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: [VisitStatus.OPEN, VisitStatus.IN_CONSULTATION] } }),
      }),
    );
  });

  it('rejects an unknown or inactive patient', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);

    await expect(
      service.create({ patientId: 'missing', chiefComplaint: 'Headache' }, 'staff-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.clinicVisit.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate active visit for the same patient today', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
    prisma.clinicVisit.findFirst.mockResolvedValue({ id: 'existing-visit' });

    await expect(
      service.create({ patientId: 'patient-1', chiefComplaint: 'Headache' }, 'staff-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.clinicVisit.create).not.toHaveBeenCalled();
  });

  it('limits walk-in creation to administrative, nurse, and clinic staff roles', () => {
    const controller = new VisitsController({} as VisitsService);

    expect(Reflect.getMetadata(ROLES_KEY, controller.create)).toEqual([
      'ADMINISTRATOR',
      'CLINIC_NURSE',
      'CLINIC_STAFF',
    ]);
  });
});
