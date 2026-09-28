import { AuditAction } from '@prisma/client';
import { AuditService } from './audit.service';

describe('AuditService privacy', () => {
  const prisma = { auditLog: { create: jest.fn(), findMany: jest.fn() } };
  const service = new AuditService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('retains attribution and action while redacting private metadata', async () => {
    prisma.auditLog.create.mockResolvedValue({});

    await service.record('actor-1', AuditAction.UPDATE, 'Patient', 'patient-1', {
      metadata: { event: 'PATIENT_UPDATED', notes: 'private clinical note', password: 'hunter2' },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'actor-1',
        action: AuditAction.UPDATE,
        entity: 'Patient',
        entityId: 'patient-1',
        metadata: { event: 'PATIENT_UPDATED', notes: '[redacted]', password: '[redacted]' },
      },
    });
  });

  it('retains status transition evidence', async () => {
    prisma.auditLog.create.mockResolvedValue({});
    await service.recordEntityStatusTransition(
      'actor-1', 'ClinicVisit', 'visit-1', AuditAction.UPDATE, 'WAITING', 'COMPLETED',
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'actor-1',
        action: AuditAction.UPDATE,
        oldValue: { status: 'WAITING' },
        newValue: { status: 'COMPLETED' },
        metadata: expect.objectContaining({ fromStatus: 'WAITING', toStatus: 'COMPLETED' }),
      }),
    });
  });
});
