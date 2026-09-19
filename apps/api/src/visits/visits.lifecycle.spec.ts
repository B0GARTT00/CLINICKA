import { UnprocessableEntityException } from '@nestjs/common';
import { AuditAction, VisitStatus } from '@prisma/client';
import { VisitsService } from './visits.service';

describe('VisitsService lifecycle', () => {
  const prisma = {
    clinicVisit: { findUnique: jest.fn(), update: jest.fn() },
    vitalSign: { count: jest.fn(), create: jest.fn() },
    consultation: { count: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const service = new VisitsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.auditLog.create.mockResolvedValue({});
    prisma.vitalSign.count.mockResolvedValue(1);
    prisma.consultation.count.mockResolvedValue(1);
  });

  it.each([
    [VisitStatus.OPEN, VisitStatus.IN_CONSULTATION],
    [VisitStatus.OPEN, VisitStatus.CANCELLED],
    [VisitStatus.IN_CONSULTATION, VisitStatus.COMPLETED],
    [VisitStatus.IN_CONSULTATION, VisitStatus.CANCELLED],
  ])('allows %s to transition to %s and audits the actor', async (from, to) => {
    prisma.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: from });
    prisma.clinicVisit.update.mockResolvedValue({ id: 'visit-1', status: to });

    await expect(service.updateStatus('visit-1', to, 'clinician-1')).resolves.toMatchObject({
      status: to,
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'clinician-1',
        action: `VISIT_STATUS_${to}` as AuditAction,
        entity: 'ClinicVisit',
        entityId: 'visit-1',
        metadata: { event: 'VISIT_STATUS_TRANSITION', from, to },
      },
    });
  });

  it.each([
    [VisitStatus.OPEN, VisitStatus.COMPLETED],
    [VisitStatus.IN_CONSULTATION, VisitStatus.OPEN],
    [VisitStatus.COMPLETED, VisitStatus.IN_CONSULTATION],
    [VisitStatus.CANCELLED, VisitStatus.IN_CONSULTATION],
  ])('rejects invalid %s to %s transitions', async (from, to) => {
    prisma.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: from });

    await expect(service.updateStatus('visit-1', to, 'clinician-1')).rejects.toThrow(
      `Invalid visit transition from ${from} to ${to}.`,
    );
    expect(prisma.clinicVisit.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('rejects completion when vital signs or a consultation are missing', async () => {
    prisma.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.IN_CONSULTATION });
    prisma.vitalSign.count.mockResolvedValue(0);
    prisma.consultation.count.mockResolvedValue(1);

    await expect(
      service.updateStatus('visit-1', VisitStatus.COMPLETED, 'clinician-1'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.clinicVisit.update).not.toHaveBeenCalled();
  });

  it('does not allow vital signs or consultations after a terminal transition', async () => {
    prisma.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.COMPLETED });

    await expect(service.addVitalSigns('visit-1', { pulseRate: 72 }, 'nurse-1')).rejects.toThrow(
      'Clinical entries cannot be added to a completed visit.',
    );
    await expect(service.addConsultation('visit-1', { cues: 'Late note' }, 'clinician-1')).rejects.toThrow(
      'Clinical entries cannot be added to a completed visit.',
    );
    expect(prisma.vitalSign.create).not.toHaveBeenCalled();
    expect(prisma.consultation.create).not.toHaveBeenCalled();
  });

  it('requires meaningful vital signs and consultation content for the longitudinal record', async () => {
    prisma.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.IN_CONSULTATION });

    await expect(service.addVitalSigns('visit-1', {}, 'nurse-1')).rejects.toThrow(
      'Record at least one vital-sign observation.',
    );
    await expect(service.addConsultation('visit-1', {}, 'clinician-1')).rejects.toThrow(
      'Record at least one clinical consultation finding or intervention.',
    );
    expect(prisma.vitalSign.create).not.toHaveBeenCalled();
    expect(prisma.consultation.create).not.toHaveBeenCalled();
  });

  it('rejects a blood pressure whose systolic value is not higher than its diastolic value', async () => {
    prisma.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.IN_CONSULTATION });

    await expect(
      service.addVitalSigns('visit-1', { systolicBp: 80, diastolicBp: 90 }, 'nurse-1'),
    ).rejects.toThrow('Systolic BP must be higher than diastolic BP.');
    expect(prisma.vitalSign.create).not.toHaveBeenCalled();
  });

  it('automatically starts an open visit when recording its first consultation and audits that transition', async () => {
    prisma.clinicVisit.findUnique.mockResolvedValue({ id: 'visit-1', status: VisitStatus.OPEN });
    prisma.consultation.create.mockResolvedValue({ id: 'consultation-1' });
    prisma.clinicVisit.update.mockResolvedValue({ id: 'visit-1', status: VisitStatus.IN_CONSULTATION });

    await service.addConsultation('visit-1', { cues: 'Headache' }, 'clinician-1');

    expect(prisma.clinicVisit.update).toHaveBeenCalledWith({
      where: { id: 'visit-1' },
      data: { status: VisitStatus.IN_CONSULTATION },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'clinician-1',
          action: AuditAction.VISIT_STATUS_IN_CONSULTATION,
          metadata: {
            event: 'VISIT_STATUS_TRANSITION',
            from: VisitStatus.OPEN,
            to: VisitStatus.IN_CONSULTATION,
          },
        }),
      }),
    );
  });
});
