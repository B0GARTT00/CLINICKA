# Developer setup

## Prerequisites

- Node.js 24+ and npm 11+
- MySQL 8.4+
- Git

## First run

```powershell
npm install
Copy-Item .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Replace both JWT placeholders with distinct random values before starting. `DATABASE_URL` must identify the intended local database. The seed is development-only; set `SEED_DEMO_PASSWORD` if a deterministic demo credential is required.

Run the API and web application in separate terminals:

```powershell
npm run dev --workspace @bchealth/api
npm run dev --workspace @bchealth/web
```

Defaults: web `http://localhost:5173`, API `http://localhost:3000/api/v1`, Swagger `http://localhost:3000/api/docs`.

## Required verification

```powershell
npm run lint
npm test
npm run build
```

Database-backed workflow tests require a disposable MySQL database whose name ends in `_test`:

```powershell
$env:TEST_DATABASE_URL = 'mysql://root:password@localhost:3306/clinicka_test'
npm run test:integration
```

The integration setup resets that database. Never point it at development, staging, or production.

## Implementing a feature

1. Update the Prisma schema and add a migration when persistence changes.
2. Add DTO validation, service rules, controller authorization, Swagger metadata, and tests.
3. Add typed API functions and a permission-gated route/page.
4. Cover loading, empty, error, success, accessibility, and server-denial behavior.
5. Update API/workflow/security documentation in the same change.
6. Run unit, frontend, build, lint, and relevant integration tests.

On Windows use `npm.cmd` if the PowerShell `npm` shim is misconfigured. Do not commit `.env`, generated private documents, logs, `dist`, or machine-specific configuration.
