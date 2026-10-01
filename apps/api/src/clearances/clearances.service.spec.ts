import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ClearanceStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ClearancesService } from './clearances.service';
import { DeterministicEligibilityEngine } from './eligibility/eligibility-engine';

describe('ClearancesService issuance rules', () => {
  const prisma = { clearance: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn() } };
  const audit = { record: jest.fn() };
  const eligibility = { evaluate: jest.fn() };
  const service = new ClearancesService(prisma as never, audit as unknown as AuditService, eligibility as unknown as DeterministicEligibilityEngine);
  const clearance = { id: 'clearance-1', patientId: 'patient-1', academicYearId: 'ay-1', semesterId: 'sem-1', eligibilityContext: {} };

  beforeEach(() => { jest.clearAllMocks(); prisma.clearance.findUnique.mockResolvedValue(clearance); });

  it('scopes self-service clearance history to the linked patient', async () => {
    prisma.clearance.findMany.mockResolvedValue([]);
    await service.list('patient-1');
    expect(prisma.clearance.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { patientId: 'patient-1' } }));
  });

  it('creates a patient-owned incomplete draft before evidence is ready', async () => {
    eligibility.evaluate.mockResolvedValue({
      patientId: 'patient-1', eligible: false, evaluatedAt: new Date('2026-09-29'),
      academicYear: { id: 'ay-1', name: '2026-2027' }, semester: { id: 'sem-1', name: 'First semester' },
      applicableRequirements: [{ id: 'r1', name: 'Medical exam', satisfied: false }],
      ineligibilityReasons: [{ detail: 'Medical exam is awaiting review.' }],
    });
    prisma.clearance.findFirst.mockResolvedValue(null);
    prisma.clearance.create.mockResolvedValue({ id: 'request-1', status: 'INCOMPLETE' });
    audit.record.mockResolvedValue({});

    await service.request({ type: 'COLLEGE' }, 'patient-1', 'student-user-1');

    expect(prisma.clearance.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ patientId: 'patient-1', status: ClearanceStatus.INCOMPLETE }) }));
    expect(audit.record).toHaveBeenCalledWith('student-user-1', expect.anything(), 'Clearance', 'request-1');
  });

  it('rejects draft submission while any requirement is missing', async () => {
    prisma.clearance.findUnique.mockResolvedValue({ ...clearance, status: ClearanceStatus.INCOMPLETE });
    eligibility.evaluate.mockResolvedValue({
      evaluatedAt: new Date(), academicYear: { id: 'ay-1' }, semester: { id: 'sem-1' },
      applicableRequirements: [{ id: 'r1', name: 'Medical exam', status: null }],
      ineligibilityReasons: [{ detail: 'Not submitted' }],
    });
    await expect(service.submitDraft('clearance-1', 'patient-1', 'student-user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.clearance.update).not.toHaveBeenCalled();
  });

  it('submits a complete draft for clinic review', async () => {
    prisma.clearance.findUnique.mockResolvedValue({ ...clearance, status: ClearanceStatus.INCOMPLETE });
    eligibility.evaluate.mockResolvedValue({
      evaluatedAt: new Date(), academicYear: { id: 'ay-1' }, semester: { id: 'sem-1' },
      applicableRequirements: [{ id: 'r1', name: 'Medical exam', status: 'SUBMITTED' }],
      ineligibilityReasons: [{ detail: 'Awaiting verification' }],
    });
    prisma.clearance.update.mockResolvedValue({ id: 'clearance-1', status: ClearanceStatus.FOR_REVIEW });
    await service.submitDraft('clearance-1', 'patient-1', 'student-user-1');
    expect(prisma.clearance.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: ClearanceStatus.FOR_REVIEW }) }));
  });

  it('rejects a duplicate active request for the same period and purpose', async () => {
    eligibility.evaluate.mockResolvedValue({ patientId: 'patient-1', evaluatedAt: new Date(), academicYear: { id: 'ay-1' }, semester: null, applicableRequirements: [], ineligibilityReasons: [] });
    prisma.clearance.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(service.request({ type: 'COLLEGE' }, 'patient-1', 'student-user-1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.clearance.create).not.toHaveBeenCalled();
  });

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
