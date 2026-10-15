import { LABORATORY_TESTS, STUDENT_LAB_GROUPS, ANNUAL_PE_POLICY, configureClinicLaboratories } from '../../../../prisma/clinic-laboratory-config';
import { matchesRequirement } from './applicability';

describe('Configured clinic laboratory requirements', () => {
  const departments = STUDENT_LAB_GROUPS.filter(group => 'department' in group).map(group => ({ id: group.key, name: group.department, programs: [] }));
  departments.push({ id: 'graduate', name: 'Graduate School', programs: [{ id: 'medicine-program', name: 'Doctor of Medicine' }] } as never);
  const upsert = jest.fn();
  const updateMany = jest.fn();
  const prisma = { semester: { findUnique: jest.fn() }, department: { findMany: jest.fn() }, $transaction: jest.fn() };
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.semester.findUnique.mockResolvedValue({ academicYearId: 'year' });
    prisma.department.findMany.mockResolvedValue(departments);
    prisma.$transaction.mockImplementation(callback => callback({ healthRequirement: { upsert, updateMany } }));
  });
  it.each([['sbism', 4], ['sase', 4], ['allied', 7], ['nursing', 7], ['medicine', 7]])('%s receives %i configured items', async (key, count) => {
    await configureClinicLaboratories(prisma as never, 'year', 'semester');
    const patient = { type: 'STUDENT', studentProfile: { departmentId: key === 'medicine' ? 'graduate' : String(key), programId: key === 'medicine' ? 'medicine-program' : null, yearLevel: 1 } };
    const requirements = upsert.mock.calls.map(([arg]) => arg.create);
    expect(requirements.filter(requirement => matchesRequirement(requirement, patient))).toHaveLength(Number(count));
  });
  it.each(['graduate', 'bed', 'cdc'])('does not assign a template to unconfigured group %s', async departmentId => {
    await configureClinicLaboratories(prisma as never, 'year', 'semester');
    expect(upsert.mock.calls.map(([arg]) => arg.create).filter(requirement => matchesRequirement(requirement, { type: 'STUDENT', studentProfile: { departmentId, programId: null, yearLevel: 1 } }))).toEqual([]);
  });
  it('preserves requirement rows and leaves HR assignment manual', async () => {
    await configureClinicLaboratories(prisma as never, 'year', 'semester');
    for (const [arg] of upsert.mock.calls) expect(arg.update).toEqual({});
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { archiveStatus: 'ARCHIVED' }, where: expect.objectContaining({ academicYearId: 'year', semesterId: 'semester' }) }));
    expect(ANNUAL_PE_POLICY.assignment).toBe('MANUAL_HR');
    expect(LABORATORY_TESTS[6]).toMatchObject({ pending: true, name: 'Additional Laboratory Requirement' });
  });
});
