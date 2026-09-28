import { EnvironmentValidationError, NodeEnv, validateEnvironment } from './env.validation';
import { MIN_PRODUCTION_SECRET_LENGTH } from './secret-policy';

const STRONG_ACCESS = 'kQ7#vZ2!pR9@xW4$mB6&nH3*jL8^dF5%';
const STRONG_REFRESH = 'wT1@cD8^sE5%gH2*fJ7!kN9#aP4$uR6&mV3*';

function productionEnv(overrides: Record<string, unknown> = {}) {
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

function messagesFor(env: Record<string, unknown>): string {
  try {
    validateEnvironment(env);
  } catch (error) {
    if (error instanceof EnvironmentValidationError) return error.problems.join('\n');
    throw error;
  }
  throw new Error('Expected the environment to be rejected, but it was accepted.');
}

describe('validateEnvironment', () => {
  describe('production', () => {
    it('accepts a fully specified, strong, distinct configuration', () => {
      expect(() => validateEnvironment(productionEnv())).not.toThrow();
    });

    it('fails when the access secret is missing', () => {
      expect(messagesFor(productionEnv({ JWT_SECRET: undefined }))).toMatch(/JWT_SECRET is required/);
    });

    it('fails when the refresh secret is missing', () => {
      expect(messagesFor(productionEnv({ JWT_REFRESH_SECRET: undefined }))).toMatch(
        /JWT_REFRESH_SECRET is required/,
      );
    });

    it('fails when a secret is blank rather than treating it as absent', () => {
      expect(messagesFor(productionEnv({ JWT_SECRET: '   ' }))).toMatch(/JWT_SECRET is required/);
    });

    it(`fails when a secret is shorter than ${MIN_PRODUCTION_SECRET_LENGTH} characters`, () => {
      expect(messagesFor(productionEnv({ JWT_SECRET: 'short-but-not-empty' }))).toMatch(
        new RegExp(`at least ${MIN_PRODUCTION_SECRET_LENGTH} characters`),
      );
    });

    it('fails when both tokens are signed with the same secret', () => {
      const problems = messagesFor(productionEnv({ JWT_REFRESH_SECRET: STRONG_ACCESS }));
      expect(problems).toMatch(/must be different values/);
      expect(problems).toMatch(/refresh token be replayed as an access token/);
    });

    it('rejects the development fallback that used to be compiled into the API', () => {
      expect(messagesFor(productionEnv({ JWT_SECRET: 'development-only-secret' }))).toMatch(
        /known development placeholder/,
      );
      expect(messagesFor(productionEnv({ JWT_REFRESH_SECRET: 'development-only-refresh-secret' }))).toMatch(
        /known development placeholder/,
      );
    });

    it('rejects the placeholder values shipped in .env.example', () => {
      expect(messagesFor(productionEnv({ JWT_SECRET: 'replace-with-a-long-random-secret' }))).toMatch(
        /placeholder/i,
      );
    });

    it('rejects a placeholder of any length', () => {
      const longPlaceholder = `your-secret-${'x'.repeat(MIN_PRODUCTION_SECRET_LENGTH)}`;
      expect(messagesFor(productionEnv({ JWT_SECRET: longPlaceholder }))).toMatch(/placeholder/i);
    });

    it('rejects a secret with no entropy', () => {
      expect(messagesFor(productionEnv({ JWT_SECRET: 'a'.repeat(48) }))).toMatch(/no entropy/i);
    });

    it('rejects a wildcard CORS origin', () => {
      expect(messagesFor(productionEnv({ CORS_ORIGIN: '*' }))).toMatch(/CORS_ORIGIN/);
    });

    it('rejects public URLs that are not https', () => {
      expect(messagesFor(productionEnv({ FRONTEND_URL: 'http://clinic.example.com' }))).toMatch(
        /FRONTEND_URL must use https/,
      );
    });

    it('rejects a database with no password and no connection URL', () => {
      expect(messagesFor(productionEnv({ DATABASE_URL: undefined }))).toMatch(/DATABASE_PASSWORD/);
    });

    it('rejects disabled secure cookies', () => {
      expect(messagesFor(productionEnv({ COOKIE_SECURE: 'false' }))).toMatch(/COOKIE_SECURE/);
    });

    it('reports every problem at once instead of one per restart', () => {
      let problems: string[] = [];
      try {
        validateEnvironment(productionEnv({ JWT_SECRET: undefined, CORS_ORIGIN: '*', FRONTEND_URL: undefined }));
      } catch (error) {
        problems = (error as EnvironmentValidationError).problems;
      }
      expect(problems.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('development and test', () => {
    it('accepts a development environment with present but weak secrets', () => {
      expect(() =>
        validateEnvironment({ NODE_ENV: 'development', JWT_SECRET: 'dev', JWT_REFRESH_SECRET: 'dev2' }),
      ).not.toThrow();
    });

    it('still refuses when the secrets are shared', () => {
      expect(messagesFor({ NODE_ENV: 'test', JWT_SECRET: 'same', JWT_REFRESH_SECRET: 'same' })).toMatch(
        /must be different values/,
      );
    });

    it('refuses to sign tokens with no secret at all, even outside production', () => {
      expect(messagesFor({ NODE_ENV: 'development' })).toMatch(/JWT_SECRET is required/);
    });

    it('defaults NODE_ENV to development', () => {
      const validated = validateEnvironment({ JWT_SECRET: 'a', JWT_REFRESH_SECRET: 'b' });
      expect(validated.NODE_ENV).toBe(NodeEnv.Development);
    });
  });

  describe('general', () => {
    it('rejects an unrecognised NODE_ENV', () => {
      expect(messagesFor({ NODE_ENV: 'staging', JWT_SECRET: 'a', JWT_REFRESH_SECRET: 'b' })).toMatch(
        /NODE_ENV must be one of/,
      );
    });

    it('rejects a malformed duration', () => {
      expect(messagesFor({ JWT_SECRET: 'a', JWT_REFRESH_SECRET: 'b', JWT_EXPIRES_IN: '15 minutes' })).toMatch(
        /JWT_EXPIRES_IN must be a duration/,
      );
    });

    it('rejects an out-of-range port', () => {
      expect(messagesFor({ JWT_SECRET: 'a', JWT_REFRESH_SECRET: 'b', PORT: '70000' })).toMatch(
        /PORT must be an integer/,
      );
    });

    it('passes the environment through without rewriting it', () => {
      const validated = validateEnvironment({ JWT_SECRET: 'a', JWT_REFRESH_SECRET: 'b', CUSTOM: 'kept' });
      expect(validated.CUSTOM).toBe('kept');
      expect(validated.JWT_SECRET).toBe('a');
    });
  });

  describe('error safety', () => {
    it('never includes the rejected secret value in the message', () => {
      const leaked = 'leakedSecretValue-9xQ#kR2@mN4$pL6!';
      const problems = messagesFor(productionEnv({ JWT_SECRET: leaked.slice(0, 8) }));
      expect(problems).not.toContain(leaked.slice(0, 8));
    });

    it('does not leak a secret that is rejected for being a placeholder', () => {
      const suspicious = 'your-super-secret-that-looks-generated-but-is-not';
      const problems = messagesFor(productionEnv({ JWT_SECRET: suspicious }));
      expect(problems).not.toContain(suspicious);
      expect(problems).toMatch(/JWT_SECRET/);
    });

    it('does not leak the refresh secret when the two are identical', () => {
      const shared = 'kQ7#vZ2!pR9@xW4$mB6&nH3*jL8^dF5%';
      const problems = messagesFor(productionEnv({ JWT_SECRET: shared, JWT_REFRESH_SECRET: shared }));
      expect(problems).not.toContain(shared);
    });

    it('does not leak secrets through the aggregate error message', () => {
      const secret = 'kQ7#vZ2!pR9@xW4$mB6&nH3*jL8^dF5%';
      let message = '';
      try {
        validateEnvironment(productionEnv({ JWT_SECRET: secret.slice(0, 10) }));
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).not.toContain(secret.slice(0, 10));
      expect(message).toContain('docs/security.md');
    });
  });
});
