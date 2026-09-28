import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

/**
 * Prints the stored profile of the demo administrator.
 *
 * The password is read from `SEED_DEMO_PASSWORD` rather than embedded here, so
 * that no credential lives in version control. When it is not set, only the
 * non-secret fields are shown and the comparison is skipped.
 */
async function main() {
  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin.demo@brokenshire.edu.ph' },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      console.log('Admin user NOT found in database. Run the seed first.');
      return;
    }

    console.log('Admin user found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  DisplayName:', user.displayName);
    console.log('  Status:', user.status);
    console.log('  Roles:', user.roles.map((r) => r.role.name));
    console.log('  PasswordHash length:', user.passwordHash.length);

    const candidate = process.env.SEED_DEMO_PASSWORD?.trim();
    if (!candidate) {
      console.log('  SEED_DEMO_PASSWORD is not set; skipping the password check.');
      return;
    }
    const valid = await bcrypt.compare(candidate, user.passwordHash);
    console.log('  SEED_DEMO_PASSWORD matches the stored hash:', valid);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('debug-login failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
