import { ForbiddenException } from '@nestjs/common';
import { ClearanceStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ClearancesService } from './clearances.service';
import { DeterministicEligibilityEngine } from './eligibility/eligibility-engine';

describe('ClearancesService issuance rules', () => {
  const prisma = { clearance: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() } };
  const audit = { record: jest.fn() };
  const eligibility = { evaluate: jest.fn() };
  const service = new ClearancesService(prisma as never, audit as unknown as AuditService, eligibility as unknown as DeterministicEligibilityEngine);
  const clearance = { id: 'clearance-1', patientId: 'patient-1', academicYearId: 'ay-1', semesterId: 'sem-1', eligibilityContext: {} };

  beforeEach(() => { jest.clearAllMocks(); prisma.clearance.findUnique.mockResolvedValue(clearance); });

  it('blocks issuance when period-scoped re-evaluation is ineligible', async () => {
    eligibility.evaluate.mockResolvedValue({ eligible: false, ineligibilityReasons: [{ detail: 'Medical examination has expired.' }] });
    await expect(service.review('clearance-1', { status: ClearanceStatus.CLEARED }, 'nurse-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(eligibility.evaluate).toHaveBeenCalledWith('patient-1', 'ay-1', 'sem-1');
    expect(prisma.clearance.update).not.toHaveBeenCalled();
  });

  it('retains the evaluated academic period and evidence snapshot on issuance', async () => {
    const evaluatedAt = new Date('2026-09-19T00:00:00.000Z');
    eligibility.evaluate.mockResolvedValue({ eligible: true, ineligibilityReasons: [], evaluatedAt, academicYear: { id: 'ay-1', name: '2026-2027' }, semester: { id: 'sem-1', name: 'First semester' }, applicableRequirements: [{ id: 'r1', name: 'Medical examination', satisfied: true }] });
    prisma.clearance.update.mockResolvedValue({ id: 'clearance-1', status: 'CLEARED' });
    audit.record.mockResolvedValue({});
    await service.review('clearance-1', { status: ClearanceStatus.CLEARED }, 'nurse-1');
    expect(prisma.clearance.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: ClearanceStatus.CLEARED, eligibilityContext: expect.objectContaining({ academicYear: { id: 'ay-1', name: '2026-2027' }, semester: { id: 'sem-1', name: 'First semester' }, applicableRequirements: [{ id: 'r1', name: 'Medical examination', satisfied: true }] }) }) }));
  });
});
