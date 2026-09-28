/**
 * Typed view of the process environment.
 *
 * Secrets are read here and nowhere else, and they have no defaults: a missing
 * value is a startup failure, not something to paper over. `validateEnvironment`
 * has already rejected an unsafe configuration by the time these run, so a
 * thrown error means the module was constructed outside that path (a unit test,
 * or a consumer that skipped `ConfigModule`) — which should also be a hard
 * failure rather than a silent downgrade to a predictable signing key.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { assessDistinctSecrets, isKnownDevelopmentSecret } from '../config/secret-policy';
import { registerSecretValue } from '../common/logging/redact';

export class MissingJwtSecretError extends Error {
  constructor(variable: string) {
    super(
      `${variable} is not configured. It is resolved from the environment and has no fallback; ` +
        'start the API through ConfigModule so validateEnvironment can enforce it.',
    );
    this.name = 'MissingJwtSecretError';
  }
}

/**
 * Refuses a secret that is one of the publicly known development fallbacks.
 *
 * This is a second line of defence behind `validateEnvironment`: even if a
 * consumer constructs this provider without that validation, a predictable
 * signing key cannot reach the token signer.
 */
export class UnsafeJwtSecretError extends Error {
  constructor(variable: string) {
    super(
      `${variable} is set to a known development placeholder and cannot be used to sign tokens. ` +
        'Generate a unique value with: openssl rand -base64 48',
    );
    this.name = 'UnsafeJwtSecretError';
  }
}

/** Raised when both token classes were configured with the same key. */
export class SharedJwtSecretError extends Error {
  constructor() {
    super(
      'JWT_SECRET and JWT_REFRESH_SECRET must be different values. ' +
        'Use independent secrets for access and refresh token signing.',
    );
    this.name = 'SharedJwtSecretError';
  }
}

@Injectable()
export class JwtSecrets {
  private cachedAccess?: string;
  private cachedRefresh?: string;

  constructor(private readonly config: ConfigService) {}

  get accessSecret(): string {
    this.load();
    return this.cachedAccess!;
  }

  get refreshSecret(): string {
    this.load();
    return this.cachedRefresh!;
  }

  /**
   * Keep the invariant at the signing boundary too.  ConfigModule validates it
   * at startup, but callers can instantiate this provider directly in tests or
   * alternate entry points; those must not be able to sign both token types
   * with a shared key.
   */
  private load(): void {
    if (this.cachedAccess && this.cachedRefresh) return;

    const access = this.require('jwt.secret', 'JWT_SECRET');
    const refresh = this.require('jwt.refreshSecret', 'JWT_REFRESH_SECRET');
    if (!assessDistinctSecrets(access, refresh).accepted) throw new SharedJwtSecretError();

    this.cachedAccess = access;
    this.cachedRefresh = refresh;
  }

  private require(configKey: string, variable: string): string {
    const value = this.config.get<string>(configKey);
    if (!value || !value.trim()) throw new MissingJwtSecretError(variable);
    if (isKnownDevelopmentSecret(value)) throw new UnsafeJwtSecretError(variable);

    // From here on the value is treated as a live credential: it is registered
    // with the redactor so that it is masked even when a driver error or a
    // message interpolates it into plain prose.
    registerSecretValue(value);

    return value;
  }
}
