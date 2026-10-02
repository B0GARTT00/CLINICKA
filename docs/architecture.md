# CLINICKA architecture

CLINICKA is a TypeScript modular monolith for school-clinic operations. The repository contains a React single-page application, a NestJS REST API, shared packages, a Prisma schema, and MySQL migrations. The active implementation is under `apps/*`, `packages/*`, and `prisma/*`; code under `apps/api/quarantine` is not imported by `AppModule` and is not part of the runtime.

## Runtime topology

```text
Browser
  └─ React 19 + Vite (`apps/web`)
       └─ Axios, bearer access token
            └─ NestJS API (`apps/api`, default `/api/v1`)
                 ├─ global throttling, authentication, authorization, validation
                 ├─ Prisma Client ── MySQL 8.4+
                 ├─ private document-storage adapter
                 └─ email provider for account messages
```

Swagger is generated from the same active Nest controllers at `/api/docs`. The web application's route checks improve navigation, but API guards and record-level service checks are the security boundary.

## Backend composition

`AppModule` imports these active feature modules:

| Module                                     | Responsibility                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `AuthModule`                               | Signup, email verification, login, refresh rotation, logout, password recovery, current session |
| `UsersModule`                              | User administration and role assignment                                                         |
| `PatientsModule`                           | Registry, self profile, patient lifecycle, health record, attachments                           |
| `AcademicModule`                           | Academic years, semesters, and active-period invariants                                         |
| `AppointmentsModule`                       | Capacity-aware booking, status lifecycle, rescheduling, cancellation, check-in                  |
| `VisitsModule`                             | Walk-ins, daily queue, vital signs, consultations, completion                                   |
| `RequirementsModule` / `EvidenceModule`    | Requirement definitions, private evidence, review, ownership and history                        |
| `ClearancesModule`                         | Eligibility, self-service requests, clinical review, issuance and archive                       |
| `ScreeningsModule`                         | External vaccination history and health screenings                                              |
| `CertificatesModule` / `EmergenciesModule` | Certificates and emergency cases                                                                |
| `InventoryModule` / `DispensingModule`     | Medicine batches, stock movements, prescribed dispensing and reconciliation                     |
| `DocumentsModule`                          | Private storage, authorized download, retention-aware deletion                                  |
| `CommunicationsModule`                     | Announcements and user-scoped notifications                                                     |
| `ReportsModule`                            | Aggregate reporting and permission-controlled audited CSV export                                |
| `AuditModule`                              | Actor/action/entity event records and administrative queries                                    |
| `HealthModule`                             | Public health endpoint                                                                          |

Controllers define HTTP and authorization metadata; DTOs validate input; services own business rules; state machines own valid transitions; Prisma owns persistence. Cross-cutting behavior lives in `common`, `auth`, `config`, `prisma`, and `audit`.

## Request path

1. Throttling runs globally.
2. `JwtAuthGuard` requires a valid access token unless the route is explicitly public.
3. `AuthorizationGuard` enforces `@Roles` and all declared `@Permissions`.
4. `ValidationPipe` transforms DTOs and rejects unknown properties.
5. The service applies record-level ownership and lifecycle rules.
6. Prisma performs the query or transaction; security-sensitive mutations write audit evidence.
7. `GlobalExceptionFilter` returns a sanitized error response; request logging uses privacy redaction.

## Sources of truth

- API surface: controller decorators and generated Swagger.
- Authorization: `apps/api/src/auth/policies/role-permissions.ts`; the web mirror is UX-only.
- Data model: `prisma/schema.prisma` plus ordered migrations.
- Workflow transitions: feature state-machine files and service tests.
- UI tokens and component defaults: `apps/web/src/theme.ts` and `apps/web/src/components/ui`.
- Runtime configuration: `apps/api/src/config` and `.env.example`.
