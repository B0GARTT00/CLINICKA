# Active API Architecture

`apps/api/src/app.module.ts` is the authoritative composition root for the
running API. A controller is active only when its Nest module is imported by
that file.

## Active module map

| Web API path family | Active Nest module | Controller source |
| --- | --- | --- |
| `/auth`, `/health` | `AuthModule`, `HealthModule` | `src/auth`, `src/health` |
| `/patients`, `/users`, `/users/roles` | `PatientsModule`, `UsersModule` | `src/modules/patients`, `src/modules/users` |
| `/clinic-visits` | `VisitsModule` | `src/visits` |
| `/appointments` | `AppointmentsModule` | `src/appointments` |
| `/requirements` | `RequirementsModule` | `src/requirements` |
| `/clearances` | `ClearancesModule` | `src/clearances` |
| `/health-records/vaccinations`, `/health-records/screenings` | `ScreeningsModule` | `src/screenings` |
| `/certificates` | `CertificatesModule` | `src/certificates` |
| `/emergencies` | `EmergenciesModule` | `src/emergencies` |
| `/announcements`, `/notifications` | `CommunicationsModule` | `src/communications` |
| `/inventory`, `/inventory/dispensing` | `InventoryModule`, `DispensingModule` | `src/inventory`, `src/dispensing` |
| `/reports`, `/audit-logs`, `/academic-years` | `ReportsModule`, `AuditModule`, `AcademicModule` | `src/reports`, `src/audit`, `src/academic` |

## Quarantined duplicate modules

The unselected, unwired duplicate implementations have been moved from
`apps/api/src/modules` to `apps/api/quarantine/unwired-modules`. They are not
compiled or exposed by the Nest application. They are retained only as a
review reference during the planned domain-by-domain consolidation.

Inactive legacy root patient HTTP controller/module and user implementation
are similarly held in `apps/api/quarantine/unwired-legacy-root`. The remaining
`src/patients/patients.service.ts` and `dto.ts` files are intentionally shared
by the active Patients module; `patient-provisioning.service.ts` and
`patient-identity.ts` remain active authentication dependencies. None of these
remaining root patient files register HTTP routes directly.

Do not reintroduce a quarantined module into `AppModule` without first:

1. comparing its controller path and API contract with the web client;
2. migrating its authorization and audit behavior; and
3. adding endpoint-level regression tests.
