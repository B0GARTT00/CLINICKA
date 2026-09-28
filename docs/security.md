# Security

BCHealth stores sensitive health information and defaults to least privilege.

## Secrets and production configuration

The API refuses to start on a configuration that would let it sign tokens with a
key an attacker could predict, reuse, or recover from the repository.

### Startup validation

`validateEnvironment` (`apps/api/src/config/env.validation.ts`) runs during
`ConfigModule.forRoot` in `AppModule`. It throws `EnvironmentValidationError` and
aborts the boot. Every problem is reported at once, and each message names the
offending **variable** and the reason — never the value — so a startup failure can
be pasted into a ticket or a log without leaking a secret.

Checked in **all** environments:

| Rule | Reason |
| --- | --- |
| `JWT_SECRET` is present and non-blank | A missing key must not fall back to a compiled-in default. |
| `JWT_REFRESH_SECRET` is present and non-blank | Same. |
| The two secrets differ | A shared key means a refresh token's signature is also a valid access token signature, so the token classes stop being distinguishable. |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` are valid durations | A malformed value silently becomes the default window. |
| `PORT`, `THROTTLE_TTL`, `THROTTLE_LIMIT` are in range | Same. |
| `NODE_ENV` is one of `development`, `test`, `production` | An unrecognised value would silently skip the production-only rules below. |

Additionally in **production**:

| Rule | Reason |
| --- | --- |
| Each secret is at least 32 characters | Below the length that a brute-force search of a short keyspace is trivial. |
| Each secret is not a known development fallback | The fallbacks this API used to ship were public once published. |
| Each secret is not placeholder-shaped | Rejects the samples from `.env.example` (`your-…`, `replace-with-…`, `<…>`, …). |
| Each secret is not a single repeated character | Length without entropy is not security. |
| `CORS_ORIGIN` is not `*` | A wildcard origin lets any site read authenticated responses. |
| `FRONTEND_URL`, `PUBLIC_API_URL` are absolute `https` URLs | Links and redirects must not be downgradable in transit. |
| `DATABASE_URL` or `DATABASE_PASSWORD` is set | A missing database password is not a default worth inheriting. |
| `PRIVATE_STORAGE_ROOT` is set for the local driver | Patient documents must not land in an implicit working directory. |
| `COOKIE_SECURE` is not disabled | Same reasoning as https above. |

In production the API also sets `ignoreEnvFile`, so a `.env` file baked into an
image cannot override the injected environment.

### Generating secrets

Two independent values. Never reuse one for both, and never reuse a value across
environments.

```bash
# macOS / Linux
openssl rand -base64 48

# PowerShell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))

# Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Set them from a secret manager, not a file:

```bash
# Example for a process manager reading from a secret store
export JWT_SECRET="$(vault kv get -field=jwt_secret secret/bchealth/api)"
export JWT_REFRESH_SECRET="$(vault kv get -field=jwt_refresh_secret secret/bchealth/api)"
```

### Rotating the signing secrets

The API accepts exactly one active access secret and one active refresh secret.
It has no key-id or dual-key window, so a rotation is a cutover.

**Blast radius of a cutover:** every access token signed with the old key stops
verifying, and every outstanding refresh token is rejected. All users are signed
out. Schedule accordingly, and do it when clinic traffic is low.

Procedure:

1. Generate both new values, per the commands above. Do not reuse either.
2. Load them into the secret manager under a new version.
3. Redeploy. If the new configuration is unsafe, the API refuses to start rather
   than serving traffic under a half-applied change — check the logs for
   `EnvironmentValidationError` before assuming the deploy succeeded.
4. Confirm `/api/v1/health` responds and that a known-good login succeeds.
5. Monitor `401` rates on `/auth/refresh`; the spike is the expected signature of
   a completed rotation.

Because there is no overlap window, do not rotate both secrets in separate
deploys during working hours — the interval between them is a window where some
sessions are already invalidated. If you need a grace period, add a
`JWT_SECRET_PREVIOUS` verification path that is checked only for access tokens
and removed on a fixed date, rather than widening the accepted key set.

To rotate a single leaked value without a full cutover, follow the same steps and
expect the sign-out.

### What must never reach the repository

`.gitignore` excludes `.env`, `.env.*`, `*.log`, `*.out`, and `*.err`; only the
two `*.example` templates are tracked. If a secret is ever committed, rotating it
is the only remediation — rewriting history does not un-clone it.

Two files previously held a credential and now do not:

- `prisma/seed.ts` reads `SEED_DEMO_PASSWORD`, or generates a random password and
  prints it once. It refuses to run when `NODE_ENV=production`.
- `debug-login.ts` reads `SEED_DEMO_PASSWORD` and skips the comparison when it
  is unset.

The runtime output files (`api-dev.out`, `tunnel.out`, and siblings) are no longer
tracked; they capture whatever the process writes, request headers included.

### Redaction

`apps/api/src/common/logging/redact.ts` masks:

- values under sensitive keys (`password`, `*Secret*`, `*Token*`, `authorization`,
  `cookie`, `apiKey`, …), at any nesting depth;
- `Bearer …` headers, JSON web tokens, `secret=`-style assignments, and the
  password inside a `scheme://user:pass@host` URI;
- **the live configured secrets themselves**, which are registered with the
  redactor by `JwtSecrets` when they are first read. This is what catches a
  secret that has been interpolated into a driver error or a message with no
  recognisable shape around it.

`GlobalExceptionFilter` and the Brevo call in `AuthService` route through it.
Belt and braces: when logging a value that could transitively contain
configuration, use `logRedacted` rather than `console.error`.

## Implemented foundation

- Password hashing in seed and login flow
- JWT access token strategy, with separate access and refresh signing secrets and
  no compiled-in defaults
- Environment validation that aborts startup on a missing or unsafe secret
- Secret redaction for every log path that can carry a credential
- Refresh token hash persistence and rotation
- Nest validation pipe with whitelisting
- Helmet security headers
- CORS configured by environment
- Global RBAC and permission authorization enforced on every route
- Sensitive user fields omitted from user listing responses
- Audit log entries on login and logout
- Rate limiting on authentication endpoints

## Required next hardening

- Patient ownership guard for student and faculty/staff access
- Document download authorization
- Dual-key overlap window for secret rotation
- Structured logger replacing `console.*` across the codebase
- Broader audit coverage for sensitive reads and mutations
