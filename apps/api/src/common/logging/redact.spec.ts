import { clearRegisteredSecrets, isSensitiveKey, redact, redactString, registerSecretValue } from './redact';

const JWT_LIKE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NSJ9.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk';

afterEach(() => clearRegisteredSecrets());

describe('redact', () => {
  describe('object keys', () => {
    it('redacts values under sensitive key names', () => {
      const redacted = redact({
        password: 'hunter2',
        passwordHash: '$2b$12$abc',
        JWT_SECRET: 'top-secret',
        jwt: { secret: 'nested-secret', refreshSecret: 'nested-refresh' },
        authorization: 'Bearer abc',
        cookie: 'session=1',
        apiKey: 'k',
        refreshToken: 'r',
      }) as Record<string, unknown>;

      const serialised = JSON.stringify(redacted);
      for (const leak of ['hunter2', '$2b$12$abc', 'top-secret', 'nested-secret', 'nested-refresh', 'Bearer abc', 'session=1']) {
        expect(serialised).not.toContain(leak);
      }
    });

    it('keeps non-sensitive fields so a log line stays useful', () => {
      expect(redact({ statusCode: 500, message: 'boom', path: '/api/v1/patients' })).toEqual({
        statusCode: 500,
        message: 'boom',
        path: '/api/v1/patients',
      });
    });

    it('matches sensitive key names case-insensitively and as substrings', () => {
      for (const key of ['Password', 'ACCESS_TOKEN', 'clientSecret', 'x-api-key', 'set-cookie', 'signature']) {
        expect(isSensitiveKey(key)).toBe(true);
      }
      for (const key of ['id', 'email', 'status', 'userAgent', 'path']) {
        expect(isSensitiveKey(key)).toBe(false);
      }
    });

    it('does not mistake authorization guard internals for credentials', () => {
      expect(isSensitiveKey('authGuard')).toBe(false);
      expect(redact({ authGuard: 'JwtAuthGuard' })).toEqual({ authGuard: 'JwtAuthGuard' });
    });
  });

  describe('errors', () => {
    it('reduces an error to name, message, and stack', () => {
      const error = new Error('connection failed for mysql://user:hunter2@db:3306/bchealth');
      const redacted = redact(error) as Record<string, unknown>;

      expect(redacted.name).toBe('Error');
      expect(String(redacted.message)).not.toContain('hunter2');
      expect(String(redacted.stack)).not.toContain('hunter2');
    });

    it('redacts a credential embedded in a connection URI', () => {
      const redacted = redactString('connect ECONNREFUSED mysql://bchealth:swordfish@db:3306/bchealth');
      expect(redacted).not.toContain('swordfish');
      expect(redacted).toContain('mysql://bchealth:');
    });

    it('redacts credentials carried on custom error properties', () => {
      const error = Object.assign(new Error('driver failure'), {
        connectionString: 'mysql://root:swordfish@localhost/bchealth',
        code: 'P1001',
      });

      const redacted = redact(error) as { properties?: Record<string, unknown> };
      expect(JSON.stringify(redacted)).not.toContain('swordfish');
      expect(redacted.properties?.code).toBe('P1001');
    });

    it('never throws on a circular structure', () => {
      const node: Record<string, unknown> = { name: 'root' };
      node.self = node;

      expect(() => redact(node)).not.toThrow();
      expect(JSON.stringify(redact(node))).toContain('[circular]');
    });

    it('bounds recursion depth instead of walking forever', () => {
      let deep: Record<string, unknown> = { leaf: true };
      for (let i = 0; i < 20; i += 1) deep = { nested: deep };

      expect(() => redact(deep)).not.toThrow();
    });
  });

  describe('free text', () => {
    it('redacts a bearer token', () => {
      expect(redactString(`Authorization: Bearer abc.def.ghi failed`)).not.toContain('abc.def.ghi');
    });

    it('redacts a JSON web token', () => {
      expect(redactString(`token was ${JWT_LIKE}`)).not.toContain(JWT_LIKE);
    });

    it('redacts secret-shaped assignment fragments', () => {
      const text = 'connect failed with refreshToken=eyJhbGciOi.abc.def password=hunter2 apiKey=abc123';
      const redacted = redactString(text);

      expect(redacted).not.toContain('hunter2');
      expect(redacted).not.toContain('abc123');
      expect(redacted).toContain('refreshToken=');
    });

    it('leaves ordinary messages untouched', () => {
      expect(redactString('Patient not found.')).toBe('Patient not found.');
    });
  });

  describe('registered secret values', () => {
    it('masks a configured secret interpolated into plain prose', () => {
      const secret = 'kQ7#vZ2!pR9@xW4$mB6&nH3*jL8^dF5%';
      registerSecretValue(secret);

      // No token shape, no URI, no assignment: only the registered value can
      // catch this.
      expect(redactString(`driver rejected key ${secret} at rest`)).not.toContain(secret);
    });

    it('masks a registered secret nested anywhere in a payload', () => {
      const secret = 'wT1@cD8^sE5%gH2*fJ7!kN9#aP4$uR6&mV3*';
      registerSecretValue(secret);

      const output = JSON.stringify(redact({ driver: { message: `no match for ${secret}` } }));
      expect(output).not.toContain(secret);
    });

    it('masks a registered secret appearing in a stack trace', () => {
      const secret = 'kQ7#vZ2!pR9@xW4$mB6&nH3*jL8^dF5%';
      registerSecretValue(secret);

      const output = JSON.stringify(redact(new Error(`boom while using ${secret}`)));
      expect(output).not.toContain(secret);
    });

    it('ignores values too short to be masked safely', () => {
      // Masking a two-character value would corrupt unrelated log output.
      registerSecretValue('ab');
      expect(redactString('a cab in a lab')).toBe('a cab in a lab');
    });

    it('stops masking after the value is cleared', () => {
      const secret = 'kQ7#vZ2!pR9@xW4$mB6&nH3*jL8^dF5%';
      registerSecretValue(secret);
      expect(redactString(secret)).not.toBe(secret);

      clearRegisteredSecrets();
      expect(redactString(secret)).toBe(secret);
    });
  });

  describe('non-plain values', () => {
    it('summarises buffers without dumping their contents', () => {
      expect(redact(Buffer.from('sensitive bytes'))).toBe('[buffer 15 bytes]');
    });

    it('serialises dates and drops functions', () => {
      const redacted = redact({ at: new Date('2026-01-01T00:00:00.000Z'), fn: () => 1 }) as Record<string, unknown>;
      expect(redacted.at).toBe('2026-01-01T00:00:00.000Z');
      expect(redacted.fn).toBe('[function]');
    });

    it('walks arrays', () => {
      expect(redact([{ password: 'a' }, { ok: 1 }])).toEqual([{ password: '[redacted]' }, { ok: 1 }]);
    });
  });
});
