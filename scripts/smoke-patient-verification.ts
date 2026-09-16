import 'dotenv/config';
import { strict as assert } from 'node:assert';
import { createHash, randomUUID } from 'node:crypto';
import { PatientType, PrismaClient } from '@prisma/client';

if (process.env.NODE_ENV === 'production') throw new Error('This smoke test is for a local development database only.');

const prisma = new PrismaClient();
const token = randomUUID();
const email = `clinicka-smoke-${randomUUID()}@brokenshire.edu.ph`;
let userId: string | undefined;
let patientId: string | undefined;

async function main() {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'STUDENT' } });
  const user = await prisma.user.create({
    data: {
      email,
      displayName: 'Verification Smoke',
      passwordHash: 'not-a-login-password',
      registrationProfile: { patientType: PatientType.STUDENT },
      emailVerificationTokenHash: createHash('sha256').update(token).digest('hex'),
      emailVerificationExpiresAt: new Date(Date.now() + 60_000),
      roles: { create: { roleId: role.id } },
    },
  });
  userId = user.id;
  assert.equal(await prisma.patient.count({ where: { email } }), 0, 'Unverified users must not have a patient.');

  const response = await fetch(`http://localhost:3000/api/v1/auth/verify-email?token=${token}`, { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.match(response.headers.get('location') ?? '', /status=success/);

  const verified = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.ok(verified.emailVerifiedAt);
  assert.ok(verified.patientId);
  patientId = verified.patientId;
  const patient = await prisma.patient.findUniqueOrThrow({ where: { id: patientId } });
  assert.equal(patient.email, email);
  assert.equal(patient.type, PatientType.STUDENT);
  assert.match(patient.patientNumber, /^CLN-\d{4}-\d{5}$/);

  await fetch(`http://localhost:3000/api/v1/auth/verify-email?token=${token}`, { redirect: 'manual' });
  assert.equal(await prisma.patient.count({ where: { email } }), 1, 'Repeated verification must not duplicate the patient.');
  console.log('Smoke test passed: unverified → verified → one linked patient.');
}

main().catch((error) => {
  console.error('Smoke test failed:', error);
  process.exitCode = 1;
}).finally(async () => {
  if (userId) {
    patientId ??= (await prisma.user.findUnique({ where: { id: userId }, select: { patientId: true } }))?.patientId ?? undefined;
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: userId }, { entity: 'User', entityId: userId }, ...(patientId ? [{ entity: 'Patient', entityId: patientId }] : [])] } });
    await prisma.user.delete({ where: { id: userId } });
  }
  if (patientId) await prisma.patient.delete({ where: { id: patientId } });
  await prisma.$disconnect();
});
