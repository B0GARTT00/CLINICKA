import { PrismaClient } from '@prisma/client';
import { configureClinicLaboratories } from './clinic-laboratory-config';

// Run with: node --env-file=.env --import tsx prisma/configure-clinic-laboratories.ts
// Add --apply only after reviewing the dry-run and selected academic period.
const prisma = new PrismaClient();
async function main() {
  const years = await prisma.academicYear.findMany({ where: { isActive: true }, include: { semesters: { where: { isActive: true } } } });
  if (years.length !== 1 || years[0].semesters.length !== 1) throw new Error('Exactly one active academic year and semester are required.');
  const year = years[0], semester = year.semesters[0];
  console.log(`Selected academic period: ${year.label} / ${semester.label}`);
  console.log('Configures 29 scoped student laboratory items; no automatic faculty/staff assignments. Archives only legacy demo requirements in this period.');
  if (!process.argv.includes('--apply')) { console.log('Dry run. Add --apply to configure this period.'); return; }
  await configureClinicLaboratories(prisma, year.id, semester.id);
  console.log('Laboratory configuration applied. Existing requirement rows, submissions and clearance snapshots retained.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
