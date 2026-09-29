# Account recovery operations

CLINICKA provides public verification-resend and password-recovery workflows
for `@brokenshire.edu.ph` accounts. All request endpoints return neutral
responses so callers cannot determine whether an account exists, is verified,
or is active.

## Verification resend

`POST /api/v1/auth/resend-verification` accepts an institutional email. For an
eligible unverified account, it replaces the previous verification token with a
new hashed token that expires after 24 hours. Replacing the stored hash
invalidates every earlier verification link.

## Password recovery

`POST /api/v1/auth/password-reset/request` creates a 256-bit random token for an
eligible account, stores only its SHA-256 hash, and emails a frontend link. The
token expires after one hour.

`POST /api/v1/auth/password-reset/complete` atomically matches and clears the
hash while updating the password. A token is therefore single-use even under
concurrent requests. Successful recovery revokes all active refresh tokens and
adds a `PASSWORD_RESET` audit entry containing the actor, action, entity, and
target identifier but not the token or password.

## Abuse controls

- Verification resend: 3 requests per IP per 15 minutes.
- Password-reset request: 3 requests per IP per 15 minutes.
- Password-reset completion: 5 attempts per IP per 15 minutes.
- Login and signup retain their existing endpoint-specific limits.

Mail delivery failures and unknown accounts receive the same public response.
Provider errors are passed through the shared secret redactor before logging.
Operators should monitor aggregate delivery failures without logging recipient
addresses or recovery links.
