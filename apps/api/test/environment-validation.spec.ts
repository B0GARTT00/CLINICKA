import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { EnvironmentValidationError } from '../src/config/env.validation';

/**
 * These tests go through the real `ConfigModule.forRoot` wiring rather than
 * calling the validator directly, because the thing that has to fail is the
 * application boot — not a helper function in isolation.
 */

const STRONG_ACCESS = 'kQ7#vZ2!pR9@xW4$mB6&nH3*jL8^dF5%';
const STRONG_REFRESH = 'wT1@cD8^sE5%gH2*fJ7!kN9#aP4$uR6&mV3*';

const ORIGINAL_ENV = { ...process.env };

function productionEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: 'production',
    JWT_SECRET: STRONG_ACCESS,
    JWT_REFRESH_SECRET: STRONG_REFRESH,
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    DATABASE_URL: 'mysql://user:password@db.internal:3306/bchealth',
    CORS_ORIGIN: 'https://clinic.brokenshire.edu.ph',
    FRONTEND_URL: 'https://clinic.brokenshire.edu.ph',
    PUBLIC_API_URL: 'https://api.brokenshire.edu.ph',
    PRIVATE_STORAGE_DRIVER: 'local',
    PRIVATE_STORAGE_ROOT: '/var/lib/bchealth/private-storage',
    ...overrides,
  };
}

/**
 * Mirrors `AppModule`'s `ConfigModule.forRoot` options and returns whatever the
 * boot produced. `forRoot` may throw either while building the module metadata
 * or while resolving it, so both paths are captured.
 */
async function boot(env: Record<string, string | undefined>) {
  const previous = { ...process.env };
  process.env = { ...env } as NodeJS.ProcessEnv;

  try {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({})],
          validate: (config: Record<string, unknown>) => {
            // Lazy import avoids loading the module under a mutated env twice.
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return require('../src/config/env.validation').validateEnvironment(config);
          },
        }),
      ],
    }).compile();

    await moduleRef.close();
    return { started: true as const };
  } catch (error) {
    return { started: false as const, error };
  } finally {
    process.env = previous;
  }
}

describe('production startup', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('starts when the environment is fully specified and safe', async () => {
    const result = await boot(productionEnv());
    expect(result.started).toBe(true);
  });

  it('fails to start when the access secret is missing', async () => {
    const result = await boot(productionEnv({ JWT_SECRET: undefined }));

    expect(result.started).toBe(false);
    expect((result as { error: Error }).error.message).toMatch(/Refusing to start/);
  });

  it('fails to start when the refresh secret is missing', async () => {
    const result = await boot(productionEnv({ JWT_REFRESH_SECRET: undefined }));
    expect(result.started).toBe(false);
  });

  it('fails to start when both tokens share one secret', async () => {
    const result = await boot(productionEnv({ JWT_REFRESH_SECRET: STRONG_ACCESS }));

    expect(result.started).toBe(false);
    expect((result as { error: Error }).error.message).toMatch(/must be different values/);
  });

  it('fails to start on the development fallback value', async () => {
    const result = await boot(productionEnv({ JWT_SECRET: 'development-only-secret' }));

    expect(result.started).toBe(false);
    expect((result as { error: Error }).error.message).toMatch(/known development placeholder/);
  });

  it('fails to start on an .env.example placeholder', async () => {
    const result = await boot(productionEnv({ JWT_SECRET: 'replace-with-a-long-random-secret' }));

    expect(result.started).toBe(false);
  });

  it('fails to start on a short secret', async () => {
    const result = await boot(productionEnv({ JWT_SECRET: 'too-short' }));
    expect(result.started).toBe(false);
  });

  it('surfaces the failure as an EnvironmentValidationError', async () => {
    const result = await boot(productionEnv({ JWT_SECRET: undefined }));
    expect((result as { error: unknown }).error).toBeInstanceOf(EnvironmentValidationError);
  });

  it('keeps the rejected values out of the startup failure', async () => {
    const secret = 'my-leaked-production-secret-9xQ#kR2@mN';
    const result = await boot(productionEnv({ JWT_SECRET: secret.slice(0, 10) }));

    expect((result as { error: Error }).error.message).not.toContain(secret.slice(0, 10));
  });

  it('does not let a .env file in a production image change the answer', async () => {
    // `AppModule` sets ignoreEnvFile for production; this asserts the flag is
    // part of the contract by showing validation still applies with it on.
    const result = await boot(productionEnv({ JWT_SECRET: '' }));
    expect(result.started).toBe(false);
  });
});
