import { ConfigService } from '@nestjs/config';
import { JwtSecrets, MissingJwtSecretError, UnsafeJwtSecretError } from './jwt-secrets';

function configWith(values: Record<string, unknown>) {
  return new ConfigService(values as never);
}

describe('JwtSecrets', () => {
  it('reads the access and refresh secrets from distinct configuration keys', () => {
    const secrets = new JwtSecrets(
      configWith({ jwt: { secret: 'access-value', refreshSecret: 'refresh-value' } }),
    );

    expect(secrets.accessSecret).toBe('access-value');
    expect(secrets.refreshSecret).toBe('refresh-value');
    expect(secrets.accessSecret).not.toBe(secrets.refreshSecret);
  });

  it('throws rather than signing with a fallback when the access secret is absent', () => {
    const secrets = new JwtSecrets(configWith({ jwt: { refreshSecret: 'refresh-value' } }));

    expect(() => secrets.accessSecret).toThrow(MissingJwtSecretError);
    expect(() => secrets.accessSecret).toThrow(/JWT_SECRET is not configured/);
  });

  it('throws when the refresh secret is absent', () => {
    const secrets = new JwtSecrets(configWith({ jwt: { secret: 'access-value' } }));

    expect(() => secrets.refreshSecret).toThrow(/JWT_REFRESH_SECRET is not configured/);
  });

  it('treats a whitespace-only secret as absent', () => {
    const secrets = new JwtSecrets(configWith({ jwt: { secret: '   ', refreshSecret: '   ' } }));

    expect(() => secrets.accessSecret).toThrow(MissingJwtSecretError);
    expect(() => secrets.refreshSecret).toThrow(MissingJwtSecretError);
  });

  it('refuses the development fallback even if validation was bypassed', () => {
    // The old configuration factory defaulted these keys when the variable was
    // unset. The point-of-use check keeps that regression from returning even
    // for a consumer that never ran validateEnvironment.
    const secrets = new JwtSecrets(
      configWith({ jwt: { secret: 'development-only-secret', refreshSecret: 'development-only-refresh-secret' } }),
    );

    expect(() => secrets.accessSecret).toThrow(UnsafeJwtSecretError);
    expect(() => secrets.refreshSecret).toThrow(UnsafeJwtSecretError);
  });

  it('refuses a fallback regardless of surrounding whitespace or case', () => {
    const secrets = new JwtSecrets(
      configWith({ jwt: { secret: '  Development-Only-Secret ', refreshSecret: 'development-only-refresh-secret' } }),
    );

    expect(() => secrets.accessSecret).toThrow(UnsafeJwtSecretError);
  });

  it('does not put the secret in the thrown error message', () => {
    const secrets = new JwtSecrets(configWith({ jwt: { secret: '', refreshSecret: '' } }));

    try {
      void secrets.accessSecret;
      throw new Error('expected a throw');
    } catch (error) {
      expect((error as Error).message).not.toMatch(/eyJ|[A-Za-z0-9]{32,}/);
    }
  });
});
