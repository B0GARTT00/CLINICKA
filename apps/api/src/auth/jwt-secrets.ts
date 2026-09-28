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
import { isKnownDevelopmentSecret } from '../config/secret-policy';
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

@Injectable()
export class JwtSecrets {
  private cachedAccess?: string;
  private cachedRefresh?: string;

  constructor(private readonly config: ConfigService) {}

  get accessSecret(): string {
    this.cachedAccess ??= this.require('jwt.secret', 'JWT_SECRET');
    return this.cachedAccess;
  }

  get refreshSecret(): string {
    this.cachedRefresh ??= this.require('jwt.refreshSecret', 'JWT_REFRESH_SECRET');
    return this.cachedRefresh;
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
