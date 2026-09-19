import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeterministicEligibilityEngine } from './eligibility-engine';
import { IneligibilityReasonCode } from './eligibility-types';

describe('DeterministicEligibilityEngine rule matrix', () => {
  const prisma = {
    patient: { findFirst: jest.fn() },
    academicYear: { findFirst: jest.fn(), findUnique: jest.fn() },
    healthRequirement: { findMany: jest.fn() },
  };
  const engine = new DeterministicEligibilityEngine(prisma as never);
  const academicYear = {
    id: 'ay-2026', label: '2026-2027', isActive: true,
    semesters: [{ id: 'semester-1', label: 'First semester', isActive: true }],
  };
  const requirement = {
    id: 'requirement-1', name: 'Medical examination', description: null, deadline: null,
    applicableTo: 'COLLEGE', academicYearId: 'ay-2026', semesterId: 'semester-1', submissions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1', patientNumber: 'STU-1', type: 'STUDENT' });
    prisma.academicYear.findFirst.mockResolvedValue(academicYear);
    prisma.academicYear.findUnique.mockResolvedValue(academicYear);
    prisma.healthRequirement.findMany.mockResolvedValue([]);
  });

  it('selects active requirements by patient scope, academic year, and semester', async () => {
    await engine.evaluate('patient-1');
    expect(prisma.healthRequirement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        archiveStatus: 'ACTIVE',
        applicableTo: { in: ['ALL', 'STUDENT', 'COLLEGE'] },
        AND: [{ academicYearId: 'ay-2026' }, { OR: [{ semesterId: null }, { semesterId: 'semester-1' }] }],
      }),
    }));
  });

  it('accepts verified, unexpired evidence', async () => {
    prisma.healthRequirement.findMany.mockResolvedValue([{ ...requirement, submissions: [{ id: 's1', status: 'VERIFIED', expiresAt: new Date('2099-01-01'), reviewedAt: new Date() }] }]);
    await expect(engine.evaluate('patient-1')).resolves.toMatchObject({ eligible: true, ineligibilityReasons: [] });
  });

  it.each([
    ['without evidence', [], IneligibilityReasonCode.NOT_SUBMITTED],
    ['with pending evidence', [{ id: 's1', status: 'SUBMITTED', expiresAt: null, reviewedAt: null }], IneligibilityReasonCode.NOT_VERIFIED],
    ['with an expired status', [{ id: 's1', status: 'EXPIRED', expiresAt: null, reviewedAt: new Date() }], IneligibilityReasonCode.EXPIRED],
    ['with a past expiry date', [{ id: 's1', status: 'VERIFIED', expiresAt: new Date('2000-01-01'), reviewedAt: new Date() }], IneligibilityReasonCode.EXPIRED],
  ])('rejects a requirement %s', async (_label, submissions, code) => {
    prisma.healthRequirement.findMany.mockResolvedValue([{ ...requirement, submissions }]);
    const result = await engine.evaluate('patient-1');
    expect(result.eligible).toBe(false);
    expect(result.ineligibilityReasons[0]).toMatchObject({ requirementId: 'requirement-1', code });
    expect(result.applicableRequirements[0]).toMatchObject({ satisfied: false, reasonCode: code });
  });

  it('rejects a semester outside the selected academic year', async () => {
    await expect(engine.evaluate('patient-1', 'ay-2026', 'semester-other')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fails closed when no active academic year is configured', async () => {
    prisma.academicYear.findFirst.mockResolvedValue(null);
    await expect(engine.evaluate('patient-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.healthRequirement.findMany).not.toHaveBeenCalled();
  });
});
