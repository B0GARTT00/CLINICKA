# Deployment and operations

## Assumed production topology

- One HTTPS origin serves the SPA; one HTTPS origin or reverse-proxied path serves the API.
- MySQL 8.4+ is managed, backed up, encrypted, and reachable only by the API.
- Private documents live outside the public web root. The current production-supported adapter is local private storage on a persistent, access-controlled volume.
- Environment variables/secrets are injected by the runtime; production ignores `.env`.
- Horizontal API replicas require a shared private-storage implementation or shared protected volume before scaling beyond one writer.

## Build and release order

```powershell
npm ci
npm run prisma:generate
npm run lint
npm test
npm run build
npx prisma migrate deploy --schema prisma/schema.prisma
```

Deploy the API after migrations succeed, then the compatible frontend. Check `GET /api/v1/health`, Swagger availability according to environment policy, login, one authorized read, and one denied-role case. Rollback application binaries only when the deployed migration is backward-compatible; never automatically roll back a destructive database migration.

## Required configuration

| Area             | Variables                                                                       |
| ---------------- | ------------------------------------------------------------------------------- |
| Runtime          | `NODE_ENV`, `PORT`, optional `API_PREFIX`                                       |
| Database         | `DATABASE_URL` (preferred), or database host/port/name/user/password inputs     |
| Authentication   | distinct `JWT_SECRET`, `JWT_REFRESH_SECRET`, optional expiry durations          |
| Browser/API URLs | `CORS_ORIGIN`, `FRONTEND_URL`, `PUBLIC_API_URL`                                 |
| Email            | `BREVO_API_KEY`, sender address and name when outbound email is enabled         |
| Storage          | `PRIVATE_STORAGE_DRIVER=local`, absolute `PRIVATE_STORAGE_ROOT`, retention days |
| Logging          | application and audit retention days                                            |
| Throttling       | `THROTTLE_TTL`, `THROTTLE_LIMIT` when overriding defaults                       |

Production validation requires HTTPS public URLs, secure cookies, non-placeholder secrets of adequate length, non-wildcard CORS, authenticated database configuration, and an explicit private-storage root.

## Operational responsibilities

- Back up MySQL and the private-document volume as one consistency set; test restoration regularly.
- Restrict backup, database, storage, log, and audit access independently of application roles.
- Monitor health, process restarts, database connections, storage capacity, email failures, HTTP 401/403/429/5xx rates, and migration failures.
- Review audit events for role changes, clinical mutations, dispensing, document access/deletion, and report exports.
- Apply the documented application/audit/document retention periods through approved operational jobs; configuration alone does not delete historical records.
- Rotate JWT secrets as a coordinated cutover; current tokens are invalidated because no dual-key overlap exists.
- Treat database exports, screenshots, support bundles, and logs as sensitive. Use anonymized data outside production.

## Recovery targets

The institution must approve recovery-point and recovery-time objectives before go-live. At minimum, retain documented restore procedures, named on-call ownership, database and document backup verification, and a rollback decision owner. UAT and disaster-recovery evidence must reference an immutable build/commit.
