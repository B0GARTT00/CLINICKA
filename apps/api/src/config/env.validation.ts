import {
  MIN_PRODUCTION_SECRET_LENGTH,
  assessDistinctSecrets,
  assessSecret,
} from './secret-policy';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

const NODE_ENV_VALUES = Object.values(NodeEnv) as string[];

/** `15m`, `7d`, `3600` — a number, or a number followed by s/m/h/d. */
const DURATION_PATTERN = /^\d+(ms|s|m|h|d)?$/;

/** Values that turn a security flag off, which production must not accept. */
const DISABLED_VALUES = new Set(['false', '0', 'no', 'off']);

/**
 * Raised when the environment is not safe to run with. The message names the
 * offending variables and the reason, never their values, so the failure can be
 * pasted into a ticket or a log without leaking a secret.
 */
export class EnvironmentValidationError extends Error {
  constructor(readonly problems: string[]) {
    super(
      [
        'Refusing to start: the environment configuration is missing or unsafe.',
        ...problems.map((problem) => `  - ${problem}`),
        'See docs/security.md for the production configuration checklist.',
      ].join('\n'),
    );
    this.name = 'EnvironmentValidationError';
  }
}

function isProduction(env: Record<string, unknown>): boolean {
  return String(env.NODE_ENV ?? '').trim().toLowerCase() === NodeEnv.Production;
}

function readString(env: Record<string, unknown>, key: string): string | undefined {
  const value = env[key];
  if (value === undefined || value === null) return undefined;
  const asString = String(value).trim();
  return asString.length ? asString : undefined;
}

function checkInteger(env: Record<string, unknown>, key: string, fallback: number, min: number, max: number, problems: string[]) {
  const raw = readString(env, key);
  if (raw === undefined) return;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    problems.push(`${key} must be an integer between ${min} and ${max}.`);
  }
}

function checkDuration(env: Record<string, unknown>, key: string, problems: string[]) {
  const raw = readString(env, key);
  if (raw === undefined) return;
  if (!DURATION_PATTERN.test(raw)) {
    problems.push(`${key} must be a duration such as 900, 15m, 1h, or 7d.`);
  }
}

/**
 * Validates process configuration and returns the values that survived.
 *
 * Every route in this file is enforced in all environments for anything that
 * would produce a broken or ambiguous security posture, and additionally in
 * production for anything that would merely be a bad default. Startup aborts
 * through {@link EnvironmentValidationError} rather than continuing with a
 * fallback, so a misconfigured deployment cannot start quietly.
 */
export function validateEnvironment(input: Record<string, unknown>): Record<string, unknown> {
  const problems: string[] = [];

  const nodeEnvRaw = readString(input, 'NODE_ENV');
  if (nodeEnvRaw && !NODE_ENV_VALUES.includes(nodeEnvRaw.toLowerCase())) {
    problems.push(`NODE_ENV must be one of ${NODE_ENV_VALUES.join(', ')}.`);
  }
  const production = isProduction(input);

  // Signing secrets are required everywhere: even a development instance should
  // not silently sign tokens with a value compiled into the source.
  const enforceStrength = production;
  const accessSecret = readString(input, 'JWT_SECRET');
  const refreshSecret = readString(input, 'JWT_REFRESH_SECRET');

  for (const [value, label] of [
    [accessSecret, 'JWT_SECRET'],
    [refreshSecret, 'JWT_REFRESH_SECRET'],
  ] as const) {
    const assessment = assessSecret(value, label, { enforceStrength });
    if (!assessment.accepted) problems.push(assessment.message!);
  }

  // Distinctness matters in every environment, not just production: it is what
  // keeps access and refresh tokens independently verifiable.
  const distinctness = assessDistinctSecrets(accessSecret, refreshSecret);
  if (!distinctness.accepted) problems.push(distinctness.message!);

  checkDuration(input, 'JWT_EXPIRES_IN', problems);
  checkDuration(input, 'JWT_REFRESH_EXPIRES_IN', problems);
  checkInteger(input, 'PORT', 3000, 1, 65535, problems);
  checkInteger(input, 'THROTTLE_TTL', 60000, 1, Number.MAX_SAFE_INTEGER, problems);
  checkInteger(input, 'THROTTLE_LIMIT', 60, 1, 1_000_000, problems);

  if (production) {
    // A refresh window that outlives the access window is expected; the reverse
    // would let a short-lived token be renewed into a longer-lived one.
    if (!readString(input, 'JWT_REFRESH_EXPIRES_IN') || !readString(input, 'JWT_EXPIRES_IN')) {
      problems.push('JWT_EXPIRES_IN and JWT_REFRESH_EXPIRES_IN must both be set in production.');
    }

    const corsOrigin = readString(input, 'CORS_ORIGIN');
    if (corsOrigin === '*' || corsOrigin?.includes(',')) {
      problems.push('CORS_ORIGIN must list the exact allowed origin(s) in production, not "*".');
    }

    if (!readString(input, 'DATABASE_URL') && !readString(input, 'DATABASE_PASSWORD')) {
      problems.push('Set DATABASE_URL, or set DATABASE_PASSWORD, so the database connection is not left unauthenticated.');
    }

    for (const key of ['FRONTEND_URL', 'PUBLIC_API_URL']) {
      const value = readString(input, key);
      if (!value) {
        problems.push(`${key} must be set in production so links and CORS resolve to the real deployment.`);
        continue;
      }
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        problems.push(`${key} must be an absolute URL.`);
        continue;
      }
      if (parsed.protocol !== 'https:') {
        problems.push(`${key} must use https in production.`);
      }
    }

    const privateStorageDriver = readString(input, 'PRIVATE_STORAGE_DRIVER');
    if (privateStorageDriver && privateStorageDriver !== 'local') {
      problems.push(`PRIVATE_STORAGE_DRIVER "${privateStorageDriver}" is not available in production yet.`);
    }
    if (privateStorageDriver === 'local' && !readString(input, 'PRIVATE_STORAGE_ROOT')) {
      problems.push('PRIVATE_STORAGE_ROOT must be set when PRIVATE_STORAGE_DRIVER is "local".');
    }

    const cookieSecure = readString(input, 'COOKIE_SECURE');
    if (cookieSecure && DISABLED_VALUES.has(cookieSecure.toLowerCase())) {
      problems.push('COOKIE_SECURE must not be disabled in production; serve the API over https instead.');
    }
  }

  if (problems.length) throw new EnvironmentValidationError(problems);

  // Normalise rather than rewrite values: `validate` must not silently repair
  // configuration, it should either pass it through or fail loudly.
  return { ...input, NODE_ENV: nodeEnvRaw ?? NodeEnv.Development };
}

export { MIN_PRODUCTION_SECRET_LENGTH };
