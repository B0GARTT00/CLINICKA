import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Permission } from '../src/auth/constants/permissions';
import { UserRole } from '../src/auth/constants/roles';
import { ROLE_PERMISSIONS } from '../src/auth/policies/role-permissions';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'IntegrationPassword123!';

describe('critical backend workflows (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let nurseToken: string;
  let studentToken: string;
  let patientId: string;
  let visitId: string;

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    await seedAuthorization(prisma);
    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    const patient = await prisma.patient.create({
      data: {
        patientNumber: 'INT-2026-0001',
        type: 'STUDENT',
        firstName: 'Integration',
        lastName: 'Patient',
        email: 'integration.patient@brokenshire.edu.ph',
        studentProfile: { create: { studentId: 'INT-STUDENT-1', program: 'BSN', yearLevel: 2 } },
      },
    });
    patientId = patient.id;

    await Promise.all([
      createUser(prisma, 'integration.admin@brokenshire.edu.ph', 'Integration Admin', UserRole.ADMINISTRATOR, passwordHash),
      createUser(prisma, 'integration.nurse@brokenshire.edu.ph', 'Integration Nurse', UserRole.CLINIC_NURSE, passwordHash),
      createUser(prisma, 'integration.student@brokenshire.edu.ph', 'Integration Student', UserRole.STUDENT, passwordHash, patient.id),
    ]);

    [adminToken, nurseToken, studentToken] = await Promise.all([
      login(app, 'integration.admin@brokenshire.edu.ph'),
      login(app, 'integration.nurse@brokenshire.edu.ph'),
      login(app, 'integration.student@brokenshire.edu.ph'),
    ]);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('authenticates valid accounts and rejects missing or insufficient authorization', async () => {
    await request(app.getHttpServer()).get('/api/v1/patients').expect(401);
    await request(app.getHttpServer()).get('/api/v1/patients').set(bearer(studentToken)).expect(403);
    const patients = await request(app.getHttpServer()).get('/api/v1/patients').set(bearer(nurseToken)).expect(200);
    expect(patients.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: patientId })]));
    await request(app.getHttpServer()).get('/api/v1/audit-logs').set(bearer(studentToken)).expect(403);
    await request(app.getHttpServer()).get('/api/v1/audit-logs').set(bearer(adminToken)).expect(200);
  });

  it('provisions a patient only after email verification and supports archive/restore', async () => {
    const signup = await request(app.getHttpServer()).post('/api/v1/auth/signup').send({
      email: 'integration.newstudent@brokenshire.edu.ph',
      displayName: 'New Integration Student',
      password: PASSWORD,
      patientType: 'STUDENT',
    }).expect(201);
    expect(signup.body.verificationUrl).toContain('/auth/verify-email?token=');

    const before = await prisma.user.findUnique({ where: { email: 'integration.newstudent@brokenshire.edu.ph' } });
    expect(before?.patientId).toBeNull();
    const verification = new URL(signup.body.verificationUrl);
    await request(app.getHttpServer()).get(`${verification.pathname}${verification.search}`).expect(302);
    const verified = await prisma.user.findUnique({ where: { email: 'integration.newstudent@brokenshire.edu.ph' } });
    expect(verified?.patientId).toBeTruthy();
    expect(verified?.emailVerificationTokenHash).toBeNull();

    await request(app.getHttpServer()).post(`/api/v1/patients/${patientId}/archive`).set(bearer(nurseToken)).expect(201);
    expect((await prisma.patient.findUnique({ where: { id: patientId } }))?.deletedAt).not.toBeNull();
    await request(app.getHttpServer()).post(`/api/v1/patients/${patientId}/restore`).set(bearer(nurseToken)).expect(201);
    expect((await prisma.patient.findUnique({ where: { id: patientId } }))?.deletedAt).toBeNull();
  });

  it('books appointments while denying patient scheduling privileges', async () => {
    const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const payload = { patientId, scheduledAt, purpose: 'Integration appointment', durationMins: 30 };
    await request(app.getHttpServer()).post('/api/v1/appointments').set(bearer(studentToken)).send(payload).expect(403);
    const created = await request(app.getHttpServer()).post('/api/v1/appointments').set(bearer(nurseToken)).send(payload).expect(201);
    expect(created.body).toEqual(expect.objectContaining({ patientId, purpose: 'Integration appointment' }));
    expect(await prisma.appointment.count({ where: { patientId } })).toBe(1);
  });

  it('creates a visit, assigns a queue number, and returns it in the queue', async () => {
    const created = await request(app.getHttpServer()).post('/api/v1/clinic-visits').set(bearer(nurseToken)).send({
      patientId,
      chiefComplaint: 'Integration workflow check',
    }).expect(201);
    visitId = created.body.id;
    expect(created.body.queueNumber).toBeGreaterThan(0);

    const queue = await request(app.getHttpServer()).get('/api/v1/clinic-visits/queue').set(bearer(nurseToken)).expect(200);
    expect(queue.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: visitId, patientId })]));
    await request(app.getHttpServer()).get('/api/v1/clinic-visits/queue').set(bearer(studentToken)).expect(403);
  });

  it('creates period-bound requirements and an incomplete clearance deterministically', async () => {
    const startYear = new Date().getUTCFullYear() + 1;
    const academicYear = await prisma.academicYear.create({
      data: {
        label: `INT-${startYear}`,
        startsAt: new Date(`${startYear}-06-01T00:00:00.000Z`),
        endsAt: new Date(`${startYear + 1}-05-31T23:59:59.000Z`),
        isActive: true,
        activeKey: 1,
      },
    });
    const semester = await prisma.semester.create({
      data: {
        academicYearId: academicYear.id,
        term: 'FIRST',
        label: 'First semester',
        startsAt: new Date(`${startYear}-06-01T00:00:00.000Z`),
        endsAt: new Date(`${startYear}-10-31T23:59:59.000Z`),
        isActive: true,
        activeKey: 1,
      },
    });

    await request(app.getHttpServer()).post('/api/v1/requirements').set(bearer(studentToken)).send({
      name: 'Forbidden requirement', applicableTo: 'STUDENT', academicYearId: academicYear.id,
    }).expect(403);
    const requirement = await request(app.getHttpServer()).post('/api/v1/requirements').set(bearer(nurseToken)).send({
      name: 'Integration medical requirement',
      applicableTo: 'STUDENT',
      academicYearId: academicYear.id,
      semesterId: semester.id,
      deadline: new Date(`${startYear}-09-01T00:00:00.000Z`).toISOString(),
    }).expect(201);
    expect(requirement.body.semesterId).toBe(semester.id);

    const clearance = await request(app.getHttpServer()).post('/api/v1/clearances').set(bearer(nurseToken)).send({
      patientId,
      type: 'ENROLLMENT',
      academicYearId: academicYear.id,
      semesterId: semester.id,
    }).expect(201);
    expect(clearance.body.status).toBe('INCOMPLETE');
    expect(clearance.body.academicYearId).toBe(academicYear.id);
  });

  it('stocks and dispenses prescribed medicine atomically', async () => {
    const medicine = await request(app.getHttpServer()).post('/api/v1/inventory/medicines').set(bearer(nurseToken)).send({
      name: 'Integration Paracetamol', dosageForm: 'tablet', unit: 'piece', reorderLevel: 5,
    }).expect(201);
    const batch = await request(app.getHttpServer()).post('/api/v1/inventory/stock-in').set(bearer(nurseToken)).send({
      medicineId: medicine.body.id,
      batchNumber: 'INT-BATCH-1',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      quantity: 20,
    }).expect(201);

    await request(app.getHttpServer()).post(`/api/v1/clinic-visits/${visitId}/consultation`).set(bearer(nurseToken)).send({
      assessment: 'Integration assessment',
      prescriptionItems: [{ medicineName: 'Integration Paracetamol', dosage: '500mg', frequency: 'once', quantity: 2 }],
    }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/inventory/dispensing').set(bearer(studentToken)).send({
      patientId, clinicVisitId: visitId, items: [{ medicineBatchId: batch.body.id, quantity: 2 }],
    }).expect(403);
    const dispensation = await request(app.getHttpServer()).post('/api/v1/inventory/dispensing').set(bearer(nurseToken)).send({
      patientId, clinicVisitId: visitId, items: [{ medicineBatchId: batch.body.id, quantity: 2 }],
    }).expect(201);
    expect(dispensation.body.patientId).toBe(patientId);
    expect((await prisma.medicineBatch.findUnique({ where: { id: batch.body.id } }))?.quantity).toBe(18);
  });

  it('retains required actor/action audit evidence', async () => {
    const actions = await prisma.auditLog.findMany({ select: { actorId: true, action: true, entity: true, entityId: true } });
    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'APPOINTMENT_CREATED', entity: 'Appointment', actorId: expect.any(String) }),
      expect.objectContaining({ action: 'VISIT_CREATED', entity: 'ClinicVisit', actorId: expect.any(String) }),
      expect.objectContaining({ action: 'MEDICINE_DISPENSED', entity: 'MedicineDispensation', actorId: expect.any(String) }),
    ]));
  });
});

async function seedAuthorization(prisma: PrismaClient) {
  await prisma.permission.createMany({
    data: Object.values(Permission).map((key) => ({ key, description: key })),
    skipDuplicates: true,
  });
  for (const roleName of Object.values(UserRole)) {
    const role = await prisma.role.create({ data: { name: roleName, description: `Integration ${roleName}` } });
    const permissions = await prisma.permission.findMany({
      where: { key: { in: [...ROLE_PERMISSIONS[roleName]] } },
      select: { id: true },
    });
    await prisma.rolePermission.createMany({ data: permissions.map(({ id }) => ({ roleId: role.id, permissionId: id })) });
  }
}

async function createUser(
  prisma: PrismaClient,
  email: string,
  displayName: string,
  roleName: UserRole,
  passwordHash: string,
  patientId?: string,
) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
  return prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash,
      emailVerifiedAt: new Date(),
      patientId,
      roles: { create: { roleId: role.id } },
    },
  });
}

async function login(app: INestApplication, email: string) {
  const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password: PASSWORD }).expect(201);
  return response.body.accessToken as string;
}
