const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'hashed_password',
  'access_token',
  'refresh_token',
  'token',
  'authorization',
  'secret',
  'client_secret',
  'api_key',
  'private_key',
  'otp',
  'verification_code',
  'jwt',
  'bearer',
  'cookie',
  'session_id',
]);

export function sanitizeAuditData(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditData(item));
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeAuditData(val);
      }
    }
    return sanitized;
  }

  return value;
}
