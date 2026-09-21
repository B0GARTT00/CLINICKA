import { EvidenceSubmissionStateMachine } from './evidence-state-machine';
import { EvidenceStatus } from './evidence-transitions';

describe('EvidenceSubmissionStateMachine persistence', () => {
  const prisma = {
    requirementSubmission: { findUnique: jest.fn(), update: jest.fn() },
  };
  const audit = { record: jest.fn() };
  const machine = new EvidenceSubmissionStateMachine(prisma as never, audit as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.requirementSubmission.findUnique.mockResolvedValue({ id: 'submission-1', status: 'SUBMITTED', statusHistory: [] });
    prisma.requirementSubmission.update.mockResolvedValue({ id: 'submission-1', status: 'VERIFIED' });
    audit.record.mockResolvedValue({});
  });

  it('persists reviewer, notes, timestamp, and status history on approval', async () => {
    await machine.transition('submission-1', EvidenceStatus.VERIFIED, 'reviewer-1', { notes: 'Evidence is complete.' });

    expect(prisma.requirementSubmission.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: EvidenceStatus.VERIFIED,
        reviewerId: 'reviewer-1',
        notes: 'Evidence is complete.',
        reviewedAt: expect.any(Date),
        statusHistory: [expect.objectContaining({ from: 'SUBMITTED', to: 'VERIFIED', actorId: 'reviewer-1' })],
      }),
    }));
  });
});
