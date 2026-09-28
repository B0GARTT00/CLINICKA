/**
 * Redaction for anything that may reach a log sink.
 *
 * The rule this module enforces is narrow on purpose: it does not try to guess
 * which values are sensitive, it removes every value whose *key* looks
 * sensitive, plus the token shapes that show up inside free-form strings and
 * exception messages. A redactor that is clever about secrets is a redactor
 * that eventually is not.
 */

const REDACTED = '[redacted]';

/**
 * Key names whose values are replaced wholesale. Matching is on the key only,
 * so a nested `password` inside an error payload is caught without the caller
 * having to know the shape.
 */
const SENSITIVE_KEY_PATTERN =
  /(pass(word|phrase|hash)?|secret|token|authorization|auth|apikey|api[_-]?key|credential|cookie|set-cookie|session[_-]?id|private[_-]?key|signature|bearer)/i;

/** Request and clinical fields that have no place in operational logs. */
const PRIVATE_CONTENT_KEY_PATTERN =
  /^(body|payload|content(base64)?|file(name)?|document|dateofbirth|email|.*name|phone(number)?|address|patientnumber|studentid|employeeid|clinical.*|medical.*|health.*|diagnos(is|es)|symptoms?|allerg(y|ies)|conditions?|treatments?|prescriptions?|medications?|vitalsigns?|subjective|objective|assessment|plan|notes?|remarks?|reason)$/i;

/** Keys that are structural rather than sensitive and would cause false hits. */
const KEY_ALLOWLIST = new Set(['authorization_guard', 'authguard', 'strategy']);

/** `Bearer <anything>` in free text, including exception messages. */
const BEARER_PATTERN = /\b(bearer)\s+[\w\-._~+/]+=*/gi;

/** A three-segment JWS, e.g. an access or refresh token embedded in a message. */
const JWT_PATTERN = /\beyJ[\w-]{4,}\.[\w-]{4,}\.[\w-]{4,}\b/g;

/** `secret=...`, `token=...` style query or form fragments. */
const ASSIGNMENT_PATTERN = /\b([\w.-]*(?:secret|token|password|apikey|api[_-]?key)[\w.-]*)\s*=\s*("[^"]*"|'[^']*'|[^\s&,;"']+)/gi;

/**
 * The password inside a connection URI, e.g. `mysql://user:hunter2@host/db`.
 *
 * Driver errors routinely embed the DSN they failed to connect with, and the key
 * it was stored under is not always obviously sensitive (`connectionString`),
 * so the credential is matched on shape rather than on key name.
 */
const URI_CREDENTIALS_PATTERN = /\b([a-z][a-z0-9+.-]*:\/\/)([^\s:@/]+):([^\s@/]*)@/gi;

const MAX_DEPTH = 6;

/** Shorter values would match too much ordinary text to be worth masking. */
const MIN_REGISTERED_SECRET_LENGTH = 8;

/**
 * The secret values this process is actually configured with.
 *
 * Shape-based matching alone cannot catch a configured secret that has been
 * interpolated into a message, a stack, or a driver error — there is no token
 * or URI around it to recognise. Registering the live values closes that gap:
 * once a secret is known, it is masked wherever it appears, including inside a
 * string that no pattern would have flagged.
 */
const registeredSecrets = new Set<string>();

/**
 * Adds a configured secret to the redaction set. Called once per signing secret
 * at startup by `JwtSecrets`, and safe to call repeatedly.
 */
export function registerSecretValue(value: string | undefined | null): void {
  if (typeof value !== 'string') return;
  const trimmed = value.trim();
  if (trimmed.length < MIN_REGISTERED_SECRET_LENGTH) return;
  registeredSecrets.add(trimmed);
}

/** Test and shutdown helper: drops every registered value. */
export function clearRegisteredSecrets(): void {
  registeredSecrets.clear();
}

function maskRegisteredSecrets(input: string): string {
  let output = input;
  // Longest first, so a secret that is a prefix of another is not partially masked.
  for (const secret of [...registeredSecrets].sort((a, b) => b.length - a.length)) {
    if (output.includes(secret)) output = output.split(secret).join(REDACTED);
  }
  return output;
}

/**
 * Returns a copy of `value` with sensitive entries replaced by `[redacted]`.
 *
 * Errors are unwrapped to name and message rather than being stringified,
 * because `String(error)` on a driver error can include the SQL parameters it
 * was executed with. Cycles, functions, and symbols are dropped.
 */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return `[${typeof value}]`;

  if (value instanceof Error) {
    // Own enumerable properties are copied into a plain object first. Passing
    // the error back into `redact` would re-enter this branch forever.
    const own: Record<string, unknown> = {};
    for (const key of Object.keys(value)) own[key] = (value as unknown as Record<string, unknown>)[key];

    return {
      name: value.name,
      message: redactString(value.message),
      ...(value.stack ? { stack: redactString(value.stack) } : {}),
      ...(Object.keys(own).length ? { properties: redact(own, depth + 1, seen) } : {}),
    };
  }

  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `[buffer ${value.length} bytes]`;

  if (depth >= MAX_DEPTH) return '[truncated]';

  if (typeof value === 'object') {
    const object = value as object;
    if (seen.has(object)) return '[circular]';
    seen.add(object);

    if (Array.isArray(value)) return value.map((entry) => redact(entry, depth + 1, seen));

    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = isSensitiveKey(key) ? REDACTED : redact(entry, depth + 1, seen);
    }
    return output;
  }

  return REDACTED;
}

export function isSensitiveKey(key: string): boolean {
  if (KEY_ALLOWLIST.has(key.toLowerCase())) return false;
  return SENSITIVE_KEY_PATTERN.test(key) || PRIVATE_CONTENT_KEY_PATTERN.test(key);
}

/** Removes token-shaped substrings and any registered secret from free text. */
export function redactString(input: string): string {
  return maskRegisteredSecrets(
    input
      .replace(JWT_PATTERN, REDACTED)
      .replace(BEARER_PATTERN, `$1 ${REDACTED}`)
      .replace(URI_CREDENTIALS_PATTERN, `$1$2:${REDACTED}@`)
      .replace(ASSIGNMENT_PATTERN, `$1=${REDACTED}`),
  );
}

/**
 * Writes a redacted record to the console. Used in place of bare `console.error`
 * on any value that could transitively contain configuration or credentials.
 */
export function logRedacted(level: 'error' | 'warn' | 'log', message: string, detail?: unknown): void {
  if (detail === undefined) {
    console[level](message);
    return;
  }
  console[level](message, redact(detail));
}
