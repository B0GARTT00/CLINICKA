import { requireIsolatedTestDatabase } from './database-safety';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = requireIsolatedTestDatabase();
process.env.JWT_SECRET = 'integration-access-secret-only-not-for-production-2026';
process.env.JWT_REFRESH_SECRET = 'integration-refresh-secret-only-not-for-production-2026';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '1h';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.PUBLIC_API_URL = 'http://localhost:3000';
process.env.PRIVATE_STORAGE_ROOT = 'tmp/integration-private-storage';
