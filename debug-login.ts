import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

async function main() {
  const prisma = new PrismaClient();

  const user = await prisma.user.findUnique({
    where: { email: 'admin.demo@brokenshire.edu.ph' },
    include: { roles: { include: { role: true } } },
  });

  if (!user) {
    console.log('Admin user NOT found in database. Run the seed first.');
    await prisma.$disconnect();
    return;
  }

  console.log('Admin user found:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  DisplayName:', user.displayName);
  console.log('  Status:', user.status);
  console.log('  Roles:', user.roles.map(r => r.role.name));
  console.log('  PasswordHash length:', user.passwordHash.length);

  const valid = await bcrypt.compare('DemoPass123!', user.passwordHash);
  console.log('  Password "DemoPass123!" valid:', valid);

  await prisma.$disconnect();
}

main().catch(console.error);
