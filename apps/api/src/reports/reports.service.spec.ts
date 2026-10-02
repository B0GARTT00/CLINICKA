import { BadRequestException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { ReportDomain } from './dto';
import { ReportsService } from './reports.service';

describe('ReportsService controlled reporting', () => {
  const prisma = {
    patient: { count: jest.fn() },
    clinicVisit: { count: jest.fn() },
    appointment: { count: jest.fn() },
    requirementSubmission: { count: jest.fn() },
    clearance: { count: jest.fn() },
    medicine: { findMany: jest.fn() },
    inventoryTransaction: { count: jest.fn() },
  };
  const audit = { record: jest.fn() };
  const service = new ReportsService(prisma as never, audit as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.patient.count.mockResolvedValue(12);
    prisma.clinicVisit.count.mockResolvedValueOnce(8).mockResolvedValueOnce(6);
    prisma.appointment.count.mockResolvedValue(4);
    audit.record.mockResolvedValue({});
  });

  it('returns only aggregate clinical counts for the requested period and patient type', async () => {
    const result = await service.operational({
      from: '2026-10-01',
      to: '2026-10-31',
      domain: ReportDomain.CLINICAL,
      patientType: 'STUDENT',
    });

    expect(result).toMatchObject({
      period: { from: '2026-10-01', to: '2026-10-31' },
      filters: { domain: 'CLINICAL', patientType: 'STUDENT' },
      activePatients: 12,
      clinical: { visits: 8, completedVisits: 6, appointments: 4 },
      compliance: null,
      inventory: null,
    });
    expect(result).not.toHaveProperty('patients');
    expect(prisma.clinicVisit.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ patient: { type: 'STUDENT' } }),
    }));
  });

  it('exports aggregate fields and audits filter context without patient data', async () => {
    const result = await service.exportCsv({
      from: '2026-10-01',
      to: '2026-10-31',
      domain: ReportDomain.CLINICAL,
    }, 'nurse-1');

    expect(result.csv).toContain('"Visits","8"');
    expect(result.csv).not.toMatch(/patient name|complaint|diagnosis|consultation/i);
    expect(audit.record).toHaveBeenCalledWith('nurse-1', AuditAction.EXPORT, 'Report', 'operational-summary', {
      metadata: expect.objectContaining({
        format: 'CSV',
        filters: { domain: 'CLINICAL', patientType: 'ALL' },
        period: { from: '2026-10-01', to: '2026-10-31' },
      }),
    });
  });

  it('rejects reversed and overlong report periods', async () => {
    await expect(service.operational({ from: '2026-10-31', to: '2026-10-01' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.operational({ from: '2024-01-01', to: '2026-10-01' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.patient.count).not.toHaveBeenCalled();
  });
});
