import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { requireIsolatedTestDatabase } from './database-safety';

export default async function globalSetup() {
  const databaseUrl = requireIsolatedTestDatabase();
  const workspace = resolve(__dirname, '..', '..', '..', '..');
  const prismaCli = resolve(workspace, 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'reset', '--force', '--skip-seed', '--skip-generate', '--schema', 'prisma/schema.prisma'], {
    cwd: workspace,
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}
