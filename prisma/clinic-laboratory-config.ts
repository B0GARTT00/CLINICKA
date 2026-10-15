import { PrismaClient } from '@prisma/client';

export const LABORATORY_TESTS = [
  { key: 'ua', name: 'U/A - Urinalysis' },
  { key: 'cbc', name: 'CBC - Complete Blood Count' },
  { key: 'se', name: 'S/E - Stool Examination' },
  { key: 'cxr', name: 'CXR (PA View) - Chest X-ray PA View' },
  { key: 'hbsag', name: 'HBsAg' },
  { key: 'anti-hbs', name: 'Anti-HBs (Quantitative)' },
  // Placeholder only: the clinic has NOT identified the seventh test.
  { key: 'pending', name: 'Additional Laboratory Requirement', pending: true },
];

// Configuration, not runtime program-name conditionals. Medicine is targeted by
// program because the current academic catalogue places it in Graduate School.
export const STUDENT_LAB_GROUPS = [
  { key: 'sbism', department: 'School of Business Information Science and Management', count: 4 },
  { key: 'sase', department: 'School of Arts and Sciences Education', count: 4 },
  { key: 'allied', department: 'Allied Health', count: 7 },
  { key: 'nursing', department: 'College of Nursing', count: 7 },
  { key: 'medicine', program: 'Doctor of Medicine', count: 7 },
];

// HR reference only. Automatic faculty/staff assignment is intentionally off.
export const ANNUAL_PE_POLICY = { assignment: 'MANUAL_HR', fourTestMaximumAge: 34, sevenTestMinimumAge: 35 } as const;

export async function configureClinicLaboratories(prisma: PrismaClient, academicYearId: string, semesterId: string) {
  const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
  if (!semester || semester.academicYearId !== academicYearId) throw new Error('Semester must belong to the selected academic year.');
  const departments = await prisma.department.findMany({ include: { programs: true } });
  const targets = STUDENT_LAB_GROUPS.map(group => {
    const department = 'department' in group ? departments.find(item => item.name === group.department) : undefined;
    const programs = departments.flatMap(item => item.programs).filter(item => 'program' in group && item.name === group.program);
    if (!department && programs.length !== 1) throw new Error(`Missing or ambiguous laboratory target: ${group.key}`);
    return { group, department, program: programs[0] };
  });
  await prisma.$transaction(async tx => {
    // Retain historical submissions and clearance snapshots. Archive only known
    // demo records in this selected period; never rewrite their names or scope.
    await tx.healthRequirement.updateMany({ where: {
      id: { in: ['demo-medical-requirement', ...['ua', 'cbc', 'se', 'cxr', 'hbsag', 'anti-hbs', 'other'].map(key => `college-${key}`)] },
      academicYearId, semesterId,
    }, data: { archiveStatus: 'ARCHIVED' } });
    for (const { group, department, program } of targets) {
      for (const test of LABORATORY_TESTS.slice(0, group.count)) {
        await tx.healthRequirement.upsert({
          where: { id: `lab-${semesterId}-${group.key}-${test.key}` }, update: {},
          create: {
            id: `lab-${semesterId}-${group.key}-${test.key}`, name: test.name,
            description: test.pending ? 'PENDING CLINIC CONFIRMATION: configurable seventh laboratory item. The test name has not been confirmed.' : 'Clinic-confirmed laboratory requirement.',
            applicableTo: 'STUDENT', academicYearId, semesterId,
            departmentIds: department ? [department.id] : [], programIds: program ? [program.id] : [],
          },
        });
      }
    }
  });
}
