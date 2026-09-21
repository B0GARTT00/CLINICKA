import { PrismaClient, Prisma, Permission, Role, PatientType, Sex } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

const DEMO_PASSWORD = 'DemoPass123!';
const ADMIN_EMAIL = 'admin.demo@brokenshire.edu.ph';
const NURSE_EMAIL = 'nurse.demo@brokenshire.edu.ph';
const STUDENT_EMAIL = 'student.demo@brokenshire.edu.ph';
const STUDENT_PATIENT_NUMBER = 'STU-2026-0001';
const ACADEMIC_YEAR_LABEL = '2026-2027';
const DEFAULT_AUDIENCE = 'ALL';

const ROLE_PERMISSIONS: Record<Role['name'], string[]> = {
  ADMINISTRATOR: ['users.manage', 'roles.manage', 'reports.read', 'audit.read', 'patients.read', 'patients.manage', 'clinical.read', 'clinical.manage', 'appointments.manage', 'requirements.manage', 'clearances.manage', 'inventory.manage', 'documents.manage', 'visits.manage'],
  CLINIC_NURSE: [
    'patients.read',
    'patients.manage',
    'clinical.read',
    'clinical.manage',
    'appointments.manage',
    'requirements.manage',
    'clearances.manage',
    'inventory.manage',
    'reports.read',
    'documents.manage',
    'visits.manage',
  ],
  DOCTOR: ['patients.read', 'patients.manage', 'clinical.read', 'clinical.manage', 'documents.manage', 'visits.manage'],
  CLINIC_STAFF: [
    'patients.read',
    'patients.manage',
    'clinical.read',
    'clinical.manage',
    'appointments.manage',
    'requirements.manage',
    'clearances.manage',
    'documents.manage',
  ],
  STUDENT: ['own_profile.read'],
  FACULTY_STAFF: ['own_profile.read'],
};

interface SeedRole {
  name: Role['name'];
  description: string;
}

interface SeedUser {
  email: string;
  displayName: string;
  roleName: Role['name'];
  patientId?: string;
}

interface CollegeRequirement {
  id: string;
  name: string;
  description: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

function log(message: string): void {
  console.log(`[seed] ${message}`);
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// ============================================================================
// SEED BUILDERS
// ============================================================================

async function seedPermissions(): Promise<Map<string, Permission['id']>> {
  log('Seeding permissions...');
  const permissionKeys = [
    ...new Set(Object.values(ROLE_PERMISSIONS).flat()),
  ];

  const permissionMap = new Map<string, Permission['id']>();

  await prisma.permission.createMany({
    data: permissionKeys.map((key) => ({
      key,
      description: key.replace('.', ' '),
    })),
    skipDuplicates: true,
  });

  const permissions = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
    select: { id: true, key: true },
  });

  for (const perm of permissions) {
    permissionMap.set(perm.key, perm.id);
  }

  return permissionMap;
}

async function seedRolesAndPermissions(
  permissionMap: Map<string, Permission['id']>,
): Promise<void> {
  log('Seeding roles and permissions...');

  const roles: SeedRole[] = Object.entries(ROLE_PERMISSIONS).map(([name]) => ({
    name: name as Role['name'],
    description: `${name} demo role`,
  }));

  await prisma.role.createMany({
    data: roles.map(({ name, description }) => ({ name, description })),
    skipDuplicates: true,
  });

  const existingRoles = await prisma.role.findMany({
    include: {
      permissions: { include: { permission: true } },
    },
  });

  const rolePermissionPairs: { roleId: string; permissionId: string }[] = [];

  for (const role of existingRoles) {
    const keys = ROLE_PERMISSIONS[role.name];
    if (!keys) continue;

    const existingPermissionIds = new Set(
      role.permissions.map((rp) => rp.permission.id),
    );

    for (const key of keys) {
      const permissionId = permissionMap.get(key);
      if (!permissionId) {
        throw new Error(`Permission "${key}" not found for role "${role.name}"`);
      }

      if (!existingPermissionIds.has(permissionId)) {
        rolePermissionPairs.push({ roleId: role.id, permissionId });
      }
    }
  }

  if (rolePermissionPairs.length > 0) {
    await prisma.rolePermission.createMany({
      data: rolePermissionPairs,
      skipDuplicates: true,
    });
  }
}

async function seedAcademicYear(): Promise<{
  academicYearId: string;
  semesterId: string;
}> {
  log('Seeding academic year and semester...');

  const ay = await prisma.academicYear.upsert({
    where: { label: ACADEMIC_YEAR_LABEL },
    update: { isActive: true },
    create: {
      label: ACADEMIC_YEAR_LABEL,
      startsAt: new Date('2026-08-01'),
      endsAt: new Date('2027-07-31'),
      isActive: true,
    },
  });

  const firstSemester = await prisma.semester.upsert({
    where: { academicYearId_term: { academicYearId: ay.id, term: 'FIRST' } },
    update: { isActive: true },
    create: {
      academicYearId: ay.id,
      term: 'FIRST',
      label: 'First Semester',
      startsAt: new Date('2026-08-01'),
      endsAt: new Date('2026-12-20'),
      isActive: true,
    },
  });

  return { academicYearId: ay.id, semesterId: firstSemester.id };
}

async function seedUsers(
  passwordHash: string,
  adminRoleId: string,
  nurseRoleId: string,
): Promise<void> {
  log('Seeding users...');

  const users: SeedUser[] = [
    {
      email: ADMIN_EMAIL,
      displayName: 'Demo Administrator',
      roleName: 'ADMINISTRATOR',
    },
    {
      email: NURSE_EMAIL,
      displayName: 'Demo Clinic Nurse',
      roleName: 'CLINIC_NURSE',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        passwordHash,
        displayName: user.displayName,
        emailVerifiedAt: new Date(),
        roles: {
          create: {
            roleId: user.roleName === 'ADMINISTRATOR' ? adminRoleId : nurseRoleId,
          },
        },
      },
    });
  }
}

async function seedPatientAndStudentUser(
  passwordHash: string,
  studentRoleId: string,
): Promise<void> {
  log('Seeding patient and student user...');

  const patient = await prisma.patient.upsert({
    where: { patientNumber: STUDENT_PATIENT_NUMBER },
    update: {},
    create: {
      patientNumber: STUDENT_PATIENT_NUMBER,
      type: PatientType.STUDENT,
      firstName: 'Demo',
      lastName: 'Student',
      email: STUDENT_EMAIL,
      birthDate: new Date('2006-05-12'),
      sex: Sex.FEMALE,
      studentProfile: {
        create: { studentId: '2026-0001', program: 'BS Information Technology', yearLevel: 1 },
      },
      emergencyContacts: {
        create: { name: 'Demo Guardian', relationship: 'Parent', phone: '+63 900 000 0000' },
      },
    },
  });

  const linkedStudentUser = await prisma.user.findUnique({
    where: { patientId: patient.id },
  });

  if (linkedStudentUser && linkedStudentUser.email !== STUDENT_EMAIL) {
    const studentEmailUser = await prisma.user.findUnique({
      where: { email: STUDENT_EMAIL },
    });

    if (studentEmailUser && studentEmailUser.id !== linkedStudentUser.id) {
      await prisma.user.update({
        where: { id: studentEmailUser.id },
        data: { patientId: null },
      });
    }

    await prisma.user.update({
      where: { id: linkedStudentUser.id },
      data: { email: STUDENT_EMAIL },
    });
  }

  await prisma.user.upsert({
    where: { email: STUDENT_EMAIL },
    update: {
      patientId: patient.id,
      passwordHash,
      displayName: 'Demo Student',
      emailVerifiedAt: new Date(),
    },
    create: {
      email: STUDENT_EMAIL,
      passwordHash,
      displayName: 'Demo Student',
      patientId: patient.id,
      emailVerifiedAt: new Date(),
      roles: { create: { roleId: studentRoleId } },
    },
  });
}

async function seedFacultyAndStaffUsers(passwordHash: string): Promise<void> {
  log('Seeding faculty and staff users...');

  const [facultyRole, staffRole] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { name: 'FACULTY_STAFF' } }),
    prisma.role.findUniqueOrThrow({ where: { name: 'CLINIC_STAFF' } }),
  ]);

  const faculty = await prisma.patient.upsert({
    where: { patientNumber: 'FAC-2026-0001' },
    update: {},
    create: {
      patientNumber: 'FAC-2026-0001', type: PatientType.FACULTY,
      firstName: 'Demo', lastName: 'Faculty', email: 'faculty.demo@brokenshire.edu.ph',
      birthDate: new Date('1985-03-20'), sex: Sex.FEMALE,
      employeeProfile: { create: { employeeId: 'FAC-2026-0001', department: 'College of Information Technology', position: 'Instructor' } },
      emergencyContacts: { create: { name: 'Demo Emergency Contact', relationship: 'Spouse', phone: '+63 900 000 0001' } },
    },
  });

  const staff = await prisma.patient.upsert({
    where: { patientNumber: 'STF-2026-0001' },
    update: {},
    create: {
      patientNumber: 'STF-2026-0001', type: PatientType.STAFF,
      firstName: 'Demo', lastName: 'Staff', email: 'staff.demo@brokenshire.edu.ph',
      birthDate: new Date('1990-07-15'), sex: Sex.MALE,
      employeeProfile: { create: { employeeId: 'STF-2026-0001', department: 'Clinic', position: 'Clinic Staff' } },
      emergencyContacts: { create: { name: 'Demo Emergency Contact', relationship: 'Parent', phone: '+63 900 000 0002' } },
    },
  });

  for (const user of [
    { email: 'faculty.demo@brokenshire.edu.ph', displayName: 'Demo Faculty Staff', patientId: faculty.id, roleId: facultyRole.id },
    { email: 'staff.demo@brokenshire.edu.ph', displayName: 'Demo Staff', patientId: staff.id, roleId: staffRole.id },
  ]) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { patientId: user.patientId, passwordHash, displayName: user.displayName, emailVerifiedAt: new Date() },
      create: {
        email: user.email, passwordHash, displayName: user.displayName, patientId: user.patientId,
        emailVerifiedAt: new Date(), roles: { create: { roleId: user.roleId } },
      },
    });
  }
}

async function seedRequirements(academicYearId: string, semesterId: string): Promise<void> {
  log('Seeding health requirements...');

  await prisma.healthRequirement.upsert({
    where: { id: 'demo-medical-requirement' },
    update: {},
    create: {
      id: 'demo-medical-requirement',
      name: 'Annual Medical Clearance Form',
      description: 'Demo requirement for incoming students.',
      applicableTo: 'STUDENT',
      academicYearId,
      semesterId,
      deadline: new Date('2026-09-30'),
    },
  });

  const collegeRequirements: CollegeRequirement[] = [
    { id: 'college-ua', name: 'College Laboratory Result - Urinalysis (UA)', description: 'Submit a valid urinalysis result for College health clearance.' },
    { id: 'college-cbc', name: 'College Laboratory Result - Complete Blood Count (CBC)', description: 'Submit a valid CBC result for College health clearance.' },
    { id: 'college-se', name: 'College Laboratory Result - Stool Examination (S/E)', description: 'Submit a valid stool examination result for College health clearance.' },
    { id: 'college-cxr', name: 'College Laboratory Result - Chest X-ray (CXR PA View)', description: 'Submit a valid chest X-ray result using the PA view for College health clearance.' },
    { id: 'college-hbsag', name: 'College Laboratory Result - HBsAg', description: 'Submit a valid HBsAg result for College health clearance.' },
    { id: 'college-anti-hbs', name: 'College Laboratory Result - Anti-HBs Quantitative', description: 'Submit a valid quantitative Anti-HBs result for College health clearance.' },
    { id: 'college-other', name: 'College Health Requirement - Other Supporting Document', description: 'Submit another clinic-approved health document when requested by the College program.' },
  ];

  await prisma.healthRequirement.createMany({
    data: collegeRequirements.map((req) => ({
      id: req.id,
      name: req.name,
      description: req.description,
      applicableTo: 'COLLEGE',
      academicYearId,
      semesterId,
    })),
    skipDuplicates: true,
  });
}

async function seedMedicines(): Promise<void> {
  log('Seeding medicines...');

  await prisma.medicine.createMany({
    data: [
      { name: 'Paracetamol', genericName: 'Acetaminophen', dosageForm: '500mg tablet', unit: 'tablet', reorderLevel: 100 },
      { name: 'Oral Rehydration Salts', dosageForm: 'sachet', unit: 'sachet', reorderLevel: 50 },
    ],
    skipDuplicates: true,
  });
}

async function seedAnnouncements(): Promise<void> {
  log('Seeding announcements...');

  const announcement = {
    title: 'Demo Clinic Advisory',
    body: 'This is seed data for BCHealth demonstrations only.',
    audience: DEFAULT_AUDIENCE,
  };

  const existing = await prisma.announcement.findFirst({ where: announcement });
  if (!existing) {
    await prisma.announcement.create({
      data: { ...announcement, publishedAt: new Date() },
    });
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  try {
    log('Starting database seed...');

    const passwordHash = await hashPassword(DEMO_PASSWORD);

    // 1. Permissions
    const permissionMap = await seedPermissions();

    // 2. Roles and role permissions
    await seedRolesAndPermissions(permissionMap);

    // 3. Get role IDs after roles exist
    const [adminRole, nurseRole, studentRole] = await Promise.all([
      prisma.role.findUniqueOrThrow({ where: { name: 'ADMINISTRATOR' } }),
      prisma.role.findUniqueOrThrow({ where: { name: 'CLINIC_NURSE' } }),
      prisma.role.findUniqueOrThrow({ where: { name: 'STUDENT' } }),
    ]);

    // 4. Academic year and semester
    const { academicYearId, semesterId } = await seedAcademicYear();

    // 5. Users/patients
    await seedUsers(
      passwordHash,
      adminRole.id,
      nurseRole.id,
    );

    await seedPatientAndStudentUser(
      passwordHash,
      studentRole.id,
    );
    await seedFacultyAndStaffUsers(passwordHash);

    // 6. Requirements
    await seedRequirements(
      academicYearId,
      semesterId,
    );

    // 7. Medicines
    await seedMedicines();

    // 8. Announcements
    await seedAnnouncements();

    log('Seed completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Unhandled seed error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
