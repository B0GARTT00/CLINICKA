# Backend integration tests

The integration suite starts the real Nest application against a dedicated
MySQL database, applies every Prisma migration, creates deterministic fixtures,
and exercises the API over HTTP. It never imports development seed data.

## Local execution

Create a disposable database whose name ends in `_test`, then set its URL and
run the suite from the repository root:

```powershell
$env:TEST_DATABASE_URL = 'mysql://root:password@localhost:3306/clinicka_test'
npm.cmd run test:integration
```

The global setup executes `prisma migrate reset --force --skip-seed`. A safety
guard rejects non-MySQL URLs and any database name that does not end in `_test`.
Never point `TEST_DATABASE_URL` at development, staging, or production data.

## Coverage

The workflow suite covers authentication, permission denial, patient lifecycle
and verified-account provisioning, appointments, visits and queue behavior,
requirements and clearances, inventory stock movements, prescription-linked
dispensing, and audit persistence. GitHub Actions runs the same command against
an ephemeral MySQL 8.4 service on every pull request and push to `main`.
