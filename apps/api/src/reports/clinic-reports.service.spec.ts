import { ClinicReportsService, ageAtVisit, reportBucket } from './clinic-reports.service';

describe('Clinic accreditation reports', () => {
  const prisma = {
    clinicVisit: { findMany: jest.fn(), count: jest.fn() },
    medicineDispensationItem: { findMany: jest.fn() },
    academicYear: { findUnique: jest.fn() }, semester: { findUnique: jest.fn() },
  };
  const audit = { record: jest.fn() };
  const service = new ClinicReportsService(prisma as never, audit as never);
  const filters = { from: '2026-10-01', to: '2026-10-31' };
  beforeEach(() => jest.resetAllMocks());
  const visit = (patientId: string, type = 'STUDENT') => ({ patientId, visitDate: new Date('2026-10-04T16:00:00Z'), patient: {
    type, studentProfile: type === 'STUDENT' ? { department: { id: 'dep', name: 'Nursing' }, programRef: { id: 'program', name: 'BS Nursing' }, program: 'BS Nursing' } : null,
    employeeProfile: type === 'STUDENT' ? null : { departmentRef: { id: 'dep', name: 'Nursing' }, department: 'Nursing' },
  } });

  it('separates total visits from unique patients, including repeated visits', async () => {
    prisma.clinicVisit.findMany.mockResolvedValue([visit('p1'), visit('p1'), visit('p2', 'FACULTY'), visit('p3', 'STAFF')]);
    const report = await service.utilization(filters);
    expect(report).toMatchObject({ totalVisits: 4, uniquePatients: 3 });
    expect(report).toHaveProperty('patientTypes', expect.arrayContaining([
      expect.objectContaining({ label: 'STUDENT', visits: 2, uniquePatients: 1 }),
      expect.objectContaining({ label: 'FACULTY', visits: 1 }), expect.objectContaining({ label: 'STAFF', visits: 1 }),
    ]));
    expect(report).toHaveProperty('departments', [expect.objectContaining({ visits: 4, uniquePatients: 3 })]);
    expect(report).toHaveProperty('weeks', [expect.objectContaining({ label: '2026-10-05', visits: 4 })]);
    expect(JSON.stringify(report)).not.toContain('p1');
  });

  it('applies department/program/type and Philippine date boundaries to queries', async () => {
    prisma.clinicVisit.findMany.mockResolvedValue([]);
    await service.utilization({ ...filters, patientType: 'STUDENT', departmentId: 'dep', programId: 'program' });
    expect(prisma.clinicVisit.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      visitDate: { gte: new Date('2026-09-30T16:00:00Z'), lt: new Date('2026-10-31T16:00:00Z') },
      patient: { type: 'STUDENT', OR: [{ studentProfile: { departmentId: 'dep' } }, { employeeProfile: { departmentId: 'dep' } }], studentProfile: { programId: 'program' } },
    } }));
  });

  it.each(['WEEK', 'MONTH'] as const)('sums actual quantities by %s and counts each transaction once across batches', async grouping => {
    const item = (quantity: number, dispensationId: string, date: string) => ({ quantity, dispensationId, dispensation: { createdAt: new Date(date) }, medicineBatch: { medicine: { id: 'med', name: 'Paracetamol', unit: 'tablet' } } });
    prisma.medicineDispensationItem.findMany.mockResolvedValue([
      item(3, 'd1', '2026-10-05T01:00:00Z'), item(2, 'd1', '2026-10-05T01:00:00Z'), item(4, 'd2', '2026-10-06T01:00:00Z'),
    ]);
    expect(await service.medicines({ ...filters, grouping })).toMatchObject({ rows: [{ medicine: 'Paracetamol', quantity: 9, transactions: 2, period: grouping === 'WEEK' ? '2026-10-05' : '2026-10' }] });
  });

  it('uses local Monday and month boundaries', () => {
    expect(reportBucket(new Date('2026-10-04T15:59:59Z'), 'WEEK')).toBe('2026-09-28');
    expect(reportBucket(new Date('2026-10-04T16:00:00Z'), 'WEEK')).toBe('2026-10-05');
    expect(reportBucket(new Date('2026-10-31T16:00:00Z'), 'MONTH')).toBe('2026-11');
  });

  it('maps normalized clinical records to the logbook with age as of visit', async () => {
    prisma.clinicVisit.count.mockResolvedValue(1);
    prisma.clinicVisit.findMany.mockResolvedValue([{
      id: 'v1', visitDate: new Date('2026-10-05T01:00:00Z'), notes: 'Review next week',
      patient: { firstName: 'Ana', middleName: null, lastName: 'Santos', sex: 'FEMALE', birthDate: new Date('2000-10-06'), studentProfile: { program: 'BS Nursing' }, employeeProfile: null },
      consultations: [{ medicalDiagnosis: 'Headache', nursingDiagnosis: null, assessment: null, medicalIntervention: null, nursingIntervention: null, plan: 'Follow up in 7 days', evaluation: 'Improved', diagnoses: [], treatments: [{ description: 'Rest', notes: null }], prescriptions: [{ instructions: 'After meals', items: [{ medicineName: 'Paracetamol', dosage: '500 mg', frequency: 'As ordered', duration: '1 day', quantity: 2 }] }] }],
    }]);
    const result = await service.logbook(filters);
    expect(result.rows[0]).toMatchObject({ date: '2026-10-05', patient: 'Ana Santos', gender: 'FEMALE', age: 25, positionCourse: 'BS Nursing', diagnosis: 'Headache' });
    expect(result.rows[0].medicalOrders).toContain('Paracetamol · 500 mg');
    expect(result.rows[0].remarksFollowUp).toContain('Follow up in 7 days');
    expect(prisma.clinicVisit.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 25 }));
    expect(ageAtVisit(null, new Date())).toBeNull();
  });

  it('rejects reversed dates and mismatched academic periods', async () => {
    await expect(service.utilization({ from: '2026-10-31', to: '2026-10-01' })).rejects.toThrow('ordered date range');
    prisma.academicYear.findUnique.mockResolvedValue({ id: 'year', startsAt: new Date('2026-01-01'), endsAt: new Date('2026-12-31') });
    prisma.semester.findUnique.mockResolvedValue({ academicYearId: 'other' });
    await expect(service.utilization({ ...filters, academicYearId: 'year', semesterId: 'term' })).rejects.toThrow('Semester does not belong');
    expect(prisma.clinicVisit.findMany).not.toHaveBeenCalled();
  });

  it('audits exports, excludes identifiers from aggregates, and escapes formula cells', async () => {
    prisma.medicineDispensationItem.findMany.mockResolvedValue([{ quantity: 2, dispensationId: 'd1', dispensation: { createdAt: new Date('2026-10-05') }, medicineBatch: { medicine: { id: 'm1', name: '=CMD()', unit: 'tablet' } } }]);
    const result = await service.exportCsv('medicines', filters, 'nurse');
    expect(result.csv).toContain("'=CMD()");
    expect(result.csv).not.toContain('d1');
    expect(audit.record).toHaveBeenCalledWith('nurse', 'EXPORT', 'Report', 'clinic-medicines', expect.objectContaining({ metadata: expect.objectContaining({ rowCount: 1 }) }));
  });
});
