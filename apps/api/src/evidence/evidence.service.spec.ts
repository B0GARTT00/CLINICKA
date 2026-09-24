import { ForbiddenException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { EvidenceService } from './evidence.service';
import { EvidenceSubmissionStateMachine } from './state-machine/evidence-state-machine';
import { EvidenceStatus } from './state-machine/evidence-transitions';

describe('EvidenceService authorization and duplicate policy', () => {
  const prisma = {
    healthRequirement: { findUnique: jest.fn() },
    patient: { findFirst: jest.fn() },
    document: { findUnique: jest.fn() },
    requirementSubmission: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const audit = { record: jest.fn() };
  const stateMachine = { transition: jest.fn(), getStatusHistory: jest.fn() };
  const service = new EvidenceService(
    prisma as never,
    audit as unknown as AuditService,
    stateMachine as unknown as EvidenceSubmissionStateMachine,
  );

  beforeEach(() => jest.clearAllMocks());

  it('limits patient submission listings to the linked patient record', async () => {
    prisma.user.findUnique.mockResolvedValue({
      patientId: 'patient-1',
      roles: [{ role: { name: 'STUDENT' } }],
    });
    prisma.requirementSubmission.findMany.mockResolvedValue([]);

    await service.listSubmissions('student-user');

    expect(prisma.requirementSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: 'patient-1' } }),
    );
  });

  it('prevents another patient from accessing a private evidence document', async () => {
    prisma.requirementSubmission.findUnique.mockResolvedValue({
      patientId: 'patient-1',
      document: { storageKey: 'evidence/private.pdf' },
    });
    prisma.user.findUnique.mockResolvedValue({
      patientId: 'patient-2',
      roles: [{ role: { name: 'STUDENT' } }],
    });

    await expect(service.getDocument('submission-1', 'other-user')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows only authorized reviewer roles to transition evidence', async () => {
    prisma.user.findUnique.mockResolvedValue({
      patientId: null,
      roles: [{ role: { name: 'CLINIC_STAFF' } }],
    });

    await expect(service.review('submission-1', EvidenceStatus.VERIFIED, 'staff-1', 'Valid')).rejects.toBeInstanceOf(ForbiddenException);
    expect(stateMachine.transition).not.toHaveBeenCalled();
  });

  it('rejects a duplicate while the existing submission is still active', async () => {
    prisma.healthRequirement.findUnique.mockResolvedValue({ id: 'requirement-1', applicableTo: 'STUDENT' });
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1', type: 'STUDENT' });
    prisma.document.findUnique.mockResolvedValue({ id: 'document-1', patientId: 'patient-1', isPrivate: true });
    prisma.requirementSubmission.findFirst.mockResolvedValue({ id: 'submission-1', status: 'SUBMITTED' });

    await expect(service.submit('requirement-1', 'document-1', 'patient-1', 'student-user')).rejects.toThrow('already been submitted');
  });
});
