# Development

## Environment

Copy `.env.example` to `.env` and replace secrets before running outside local development.

## Commands

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev --workspace @bchealth/api
npm run dev --workspace @bchealth/web

```

## Windows npm troubleshooting

Use the Node.js installation's `npm.cmd` command when PowerShell's `npm`
launcher is misconfigured. A symptom is an error referring to a missing
`%APPDATA%\\npm\\node_modules\\npm\\bin\\npm-cli.js` file.

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run lint
```

Reinstall Node.js LTS or repair the user-level npm installation if `npm.cmd`
also fails. Do not commit machine-specific PATH or npm-prefix settings to this
repository.

## Implementation Order

The project should advance phase by phase:

1. Foundation
2. Database
3. Authentication and RBAC
4. Patient management
5. Clinic visits and consultations
6. Appointments
7. Requirements and clearances
8. Inventory
9. Certificates and documents
10. Reports, notifications, archives, audit, testing, and deployment

Each feature should include schema changes, DTOs, services, controllers, authorization, frontend integration, tests, and documentation updates.
