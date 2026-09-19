import { UnprocessableEntityException } from '@nestjs/common';
import { VisitStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { VisitStateMachine } from './state-machine/visit-state-machine';
import { VisitsService } from './visits.service';

describe('VisitsService clinical-entry lifecycle rules', () => {
  const prisma = {
    clinicVisit: { findUnique: jest.fn(), update: jest.fn() },
    vitalSign: { count: jest.fn(), create: jest.fn() },
    consultation: { count: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const audit = new AuditService(prisma as unknown as PrismaService);
  const stateMachine = new VisitStateMachine(prisma as unknown as PrismaService, audit);
  const service = new VisitsService(prisma as unknown as PrismaService, audit, stateMachine);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.clinicVisit.findUnique.mockResolvedValue({
      id: 'visit-1',
      status: VisitStatus.IN_CONSULTATION,
    });
  });

  it('rejects clinical entries after a terminal transition', async () => {
    prisma.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.COMPLETED });

    await expect(service.addVitalSigns('visit-1', { pulseRate: 72 }, 'nurse-1')).rejects.toThrow(
      'Clinical entries cannot be added to a completed visit.',
    );
    await expect(service.addConsultation('visit-1', { cues: 'Late note' }, 'clinician-1')).rejects.toThrow(
      'Clinical entries cannot be added to a completed visit.',
    );
  });

  it('requires meaningful vital signs and consultation content', async () => {
    await expect(service.addVitalSigns('visit-1', {}, 'nurse-1')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    await expect(service.addConsultation('visit-1', {}, 'clinician-1')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('rejects a systolic pressure that is not higher than the diastolic pressure', async () => {
    await expect(
      service.addVitalSigns('visit-1', { systolicBp: 80, diastolicBp: 90 }, 'nurse-1'),
    ).rejects.toThrow('Systolic BP must be higher than diastolic BP.');
  });
});

