/**
 * Weak or placeholder secret detection shared by validation and rotation
 * documentation. A value that appears here is never acceptable in production,
 * even if it satisfies the length requirement.
 */

/** Minimum length enforced for signing secrets in production. */
export const MIN_PRODUCTION_SECRET_LENGTH = 32;

/**
 * Values that must never be used to sign real tokens. The development
 * fallbacks that used to be compiled into the API are listed here explicitly so
 * that removing the fallback is not the only thing standing between a leaked
 * default and a production deployment.
 */
export const FORBIDDEN_SECRET_VALUES = [
  'development-only-secret',
  'development-only-refresh-secret',
  'secret',
  'supersecret',
  'change-me',
  'changeme',
  'your-secret-key',
  'your-refresh-secret',
  'replace-with-a-long-random-secret',
  'replace-with-a-different-long-random-secret',
  'please-change-in-production',
] as const;

/** Placeholder-shaped values, including the samples shipped in `.env.example`. */
const PLACEHOLDER_PATTERN =
  /(your|replace|change|example|placeholder|insert|enter|sample|dummy|test[-_]?only|xxx+|todo|<[^>]+>)/i;

/** Long runs of one character, e.g. `aaaaaaaa...`, which carry no entropy. */
const REPEATED_CHARACTER_PATTERN = /^(.)\1+$/;

export type SecretRejectionReason =
  | 'missing'
  | 'too-short'
  | 'placeholder'
  | 'low-entropy'
  | 'known-development-value'
  | 'shared-with-other-secret';

export interface SecretAssessment {
  accepted: boolean;
  reason?: SecretRejectionReason;
  /** Operator-facing explanation. Must never contain the value being checked. */
  message?: string;
}

function knownDevelopmentValue(value: string): boolean {
  return (FORBIDDEN_SECRET_VALUES as readonly string[]).includes(value.trim().toLowerCase());
}

/**
 * True when a value is one of the fallbacks this API previously compiled in.
 *
 * Checked at the point of use as well as during validation, so that a consumer
 * which builds the secret provider without going through `validateEnvironment`
 * still cannot end up signing tokens with a publicly known key.
 */
export function isKnownDevelopmentSecret(value: string | undefined | null): boolean {
  return typeof value === 'string' && knownDevelopmentValue(value);
}

/**
 * Judges a signing secret without ever echoing it.
 *
 * `label` names the environment variable so the operator knows which secret to
 * replace. The returned message is safe to print: it contains the label and a
 * reason, never the value.
 */
export function assessSecret(
  value: string | undefined | null,
  label: string,
  options: { enforceStrength: boolean },
): SecretAssessment {
  const trimmed = typeof value === 'string' ? value.trim() : '';

  if (!trimmed) {
    return {
      accepted: false,
      reason: 'missing',
      message: `${label} is required. Generate one with: openssl rand -base64 48`,
    };
  }

  if (options.enforceStrength) {
    // The known-value check runs before the length check so that the specific
    // fallback this API used to ship is reported by name rather than as a
    // generic "too short" complaint.
    if (knownDevelopmentValue(trimmed)) {
      return {
        accepted: false,
        reason: 'known-development-value',
        message: `${label} is set to a known development placeholder. Generate a unique value with: openssl rand -base64 48`,
      };
    }

    if (trimmed.length < MIN_PRODUCTION_SECRET_LENGTH) {
      return {
        accepted: false,
        reason: 'too-short',
        message: `${label} must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production; got ${trimmed.length}. Generate one with: openssl rand -base64 48`,
      };
    }

    if (PLACEHOLDER_PATTERN.test(trimmed)) {
      return {
        accepted: false,
        reason: 'placeholder',
        message: `${label} still looks like a placeholder rather than a generated secret. Generate one with: openssl rand -base64 48`,
      };
    }

    if (REPEATED_CHARACTER_PATTERN.test(trimmed)) {
      return {
        accepted: false,
        reason: 'low-entropy',
        message: `${label} is a single repeated character and carries no entropy. Generate one with: openssl rand -base64 48`,
      };
    }
  }

  return { accepted: true };
}

/**
 * Rejects signing when the access and refresh secrets are identical.
 *
 * Sharing one key means a leaked refresh token's signature is also a valid
 * access token signature, so the two token classes stop being distinguishable.
 */
export function assessDistinctSecrets(
  accessSecret: string | undefined | null,
  refreshSecret: string | undefined | null,
): SecretAssessment {
  if (!accessSecret || !refreshSecret) return { accepted: true };

  if (accessSecret.trim() === refreshSecret.trim()) {
    return {
      accepted: false,
      reason: 'shared-with-other-secret',
      message:
        'JWT_SECRET and JWT_REFRESH_SECRET must be different values. A shared key would let a refresh token be replayed as an access token. Generate two independent secrets with: openssl rand -base64 48',
    };
  }

  return { accepted: true };
}
