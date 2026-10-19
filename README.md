<div align="center">
	<img src="apps/web/public/clinova-emblem.png" alt="CLINICKA emblem" width="96" />
	<h1>CLINICKA</h1>
	<p><strong>School Clinic Management System</strong></p>
	<p>A secure health information workspace for Brokenshire College in Davao City.</p>

  <p>
    <a href="docs/architecture.md">Architecture</a> ·
    <a href="docs/api.md">API Docs</a> ·
    <a href="docs/database.md">Database</a> ·
    <a href="docs/security.md">Security</a> ·
    <a href="docs/development.md">Development</a> ·
    <a href="docs/uat/task-27-uat-plan.md">UAT</a>
  </p>
</div>

## Overview

CLINICKA is a web-based clinic information and records management system built for a private higher-education institution. It supports the day-to-day work of clinic nurses, physicians, dentists, administrators, students, and faculty or staff.

The system is designed as a **secure modular monolith**, not a hospital information system. It prioritizes privacy, clear workflows, role-based access, and a calm institutional interface.

## What It Covers

| Area                        | Purpose                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------- |
| Patient records             | Student, faculty, and staff profiles, contacts, allergies, and conditions           |
| Electronic health records   | Clinic visits, vital signs, consultations, diagnoses, treatments, and prescriptions |
| Appointments                | Scheduling and appointment status management                                        |
| Requirements and clearances | Medical, dental, PE, sports, and employment-related records                         |
| Inventory                   | Medicines, batches, stock movements, expiry monitoring, and dispensing              |
| Certificates and documents  | Private patient documents and issued medical certificates                           |
| Security and audit          | JWT authentication, RBAC, rate limiting, and audit events                           |

## Architecture

```mermaid
flowchart LR
		Web[React + TypeScript + Vite]
		API[NestJS REST API]
		DB[(MySQL)]
		Prisma[Prisma ORM]
		Docs[Private document storage]
		Audit[Audit logging]

		Web -->|JWT / REST| API
		API --> Prisma
		Prisma --> DB
		API --> Docs
		API --> Audit
```

### Repository Structure

```text
apps/
├── api/          NestJS API, authentication, RBAC, and domain modules
└── web/          React frontend, routes, layouts, and clinic workflows
packages/
├── config/       Shared roles and permission constants
└── types/        Shared API-facing TypeScript types
prisma/           MySQL schema, migrations, and seed data
docs/             Architecture, API, database, security, and development notes
```

## Technology

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router
- **Data and forms:** TanStack Query, React Hook Form, Zod, Axios
- **Backend:** NestJS, TypeScript, REST, Swagger
- **Persistence:** MySQL, Prisma
- **Security:** JWT, refresh-token rotation, RBAC, strict validation, CORS, rate limiting
- **Testing:** Vitest, Testing Library, Jest, and Supertest
- **Database:** MySQL 8.4+ running locally or on a managed database service

## Getting Started

### Requirements

- Node.js 24+
- npm 11+
- MySQL 8.4+

### Installation

```bash
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

On macOS or Linux, replace the `copy` command with:

```bash
cp .env.example .env
```

Update `.env` with local secrets before using the application outside development.

### Run Locally

Start the API and web app in separate terminals:

```bash
npm run dev --workspace @clinicka/api
npm run dev --workspace @clinicka/web
```

| Service         | URL                                                              |
| --------------- | ---------------------------------------------------------------- |
| Web application | [http://localhost:5173](http://localhost:5173)                   |
| REST API        | [http://localhost:3000/api/v1](http://localhost:3000/api/v1)     |
| Swagger         | [http://localhost:3000/api/docs](http://localhost:3000/api/docs) |

## Authentication and Email Verification

New self-service accounts are created as unverified accounts. The signup flow:

1. Collects the applicant's institutional email and affiliation.
2. Sends a one-time verification link that expires after 24 hours.
3. Keeps login disabled until the link is successfully consumed.
4. Creates or links the applicant's patient record during verification.

The web app shows a confirmation modal after signup with Inbox, Spam, and Junk
guidance. If the verification link opens in another browser tab, the original
signup tab updates after successful verification. The verification page can be
closed after the account is activated.

To send real verification emails, configure the SMTP values in `.env`:

```dotenv
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-gmail-app-password"
SMTP_FROM="CLINICKA <your-email@gmail.com>"
```

For Gmail, use an app password rather than the normal account password. Keep
SMTP credentials and signing secrets out of source control. When SMTP is not
configured in development, signup can still complete and the API logs the
verification link for local testing.

Verification resend and password recovery are documented in
[docs/account-recovery.md](docs/account-recovery.md). The account-to-patient
lifecycle is documented in
[docs/patient-registration.md](docs/patient-registration.md).

## Demo Access

Seed data includes development-only accounts. Do not use these credentials in a production environment.

```text
Email:    admin.demo@brokenshire.edu.ph
Password: DemoPass123!
```

Additional seeded accounts use the `*.demo@brokenshire.edu.ph` email pattern.

## Security and Privacy

CLINICKA handles sensitive health information. The application foundation includes:

- Hashed passwords and JWT access tokens
- Hashed, rotated refresh tokens
- Server-side role-based access control
- Request validation with whitelisting
- Environment-controlled CORS and strict request validation
- Authentication rate limiting
- Audit events for login and logout
- Private document storage requirements

Security controls are not a substitute for institutional policy. Production deployment should also include ownership checks, document authorization, sanitized error handling, structured logging with redaction, retention rules, backups, and privacy review under the Philippine Data Privacy Act of 2012.

Read the complete security notes in [docs/security.md](docs/security.md).

## Development Commands

```bash
npm run build
npm run lint
npm test
```

Workspace-specific commands are available through npm workspaces:

```bash
npm run build --workspace @clinicka/api
npm run build --workspace @clinicka/web
npm run test --workspace @clinicka/web
```

## Project Status

The active implementation includes authentication and RBAC, patient records, academic periods, appointments, clinic visits and consultation, requirements/evidence/clearances, vaccination history and screening, certificates, emergencies, inventory and dispensing, communications, aggregate reporting, private documents, and audit logs.

Changes to any module follow this implementation contract:

1. Define the domain contract and authorization rules.
2. Add validated DTOs, services, and controllers.
3. Connect the React workflow to the real API.
4. Add loading, empty, error, audit, and test coverage.
5. Document the behavior and deployment considerations.

## Documentation

- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Frontend conventions](docs/frontend.md)
- [Database](docs/database.md)
- [Security](docs/security.md)
- [Development](docs/development.md)
- [Implemented workflows](docs/workflows.md)
- [Deployment and operations](docs/deployment-and-operations.md)
- [Reporting and controlled export](docs/reporting-and-export.md)
- [Task 27 UAT plan and records](docs/uat/task-27-uat-plan.md)

## License

This project is maintained for Brokenshire College clinic operations and development purposes.
