import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PatientProvisioningService } from '../apps/api/src/patients/patient-provisioning.service';
import { patientTypeForRoles } from '../apps/api/src/patients/patient-identity';
import { PrismaService } from '../apps/api/src/prisma/prisma.service';

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();
const provisioning = new PatientProvisioningService(prisma as PrismaService);

async function main() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, emailVerifiedAt: { not: null }, patientId: null, roles: { some: { role: { name: { in: ['STUDENT', 'FACULTY_STAFF'] } } } } },
    select: { id: true, email: true, registrationProfile: true, roles: { select: { role: { select: { name: true } } } } },
  });
  const totals = { eligible: users.length, created: 0, linked: 0, skipped: 0, conflicts: 0 };
  for (const user of users) {
    const type = patientTypeForRoles(user.roles.map((entry) => entry.role.name), user.registrationProfile);
    if (!type) {
      totals.skipped++;
      console.log(`SKIP ${user.id}: affiliation needs review`);
      continue;
    }
    const existing = await prisma.patient.findUnique({ where: { email: user.email }, include: { user: { select: { id: true } } } });
    if (existing && (existing.type !== type || (existing.user && existing.user.id !== user.id))) {
      totals.conflicts++;
      console.log(`CONFLICT ${user.id}: existing patient needs review`);
      continue;
    }
    if (!apply) {
      totals[existing ? 'linked' : 'created']++;
      continue;
    }
    try {
      const outcome = await provisioning.backfillUser(user.id);
      totals[outcome]++;
    } catch (error) {
      totals.conflicts++;
      console.log(`CONFLICT ${user.id}: ${error instanceof Error ? error.name : 'unknown error'}`);
    }
  }
  console.log(`${apply ? 'Applied' : 'Dry run'}: ${JSON.stringify(totals)}`);
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
