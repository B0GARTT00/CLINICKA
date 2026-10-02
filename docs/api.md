# Active API reference

The default REST prefix is `/api/v1` (`API_PREFIX` may override it). Swagger UI is served at `/api/docs` and generated from active controllers. Paths below omit `/api/v1`. JSON requests are limited to 6 MB and validated with transformation, whitelisting, and rejection of unknown fields.

Except for health and the account-entry endpoints identified below, every endpoint requires `Authorization: Bearer <access-token>` plus its declared roles and permissions. Swagger shows the same bearer requirements through `applyAuthorizationToDocument`.

## Public and authentication

| Method | Path                            | Purpose                                            |
| ------ | ------------------------------- | -------------------------------------------------- |
| GET    | `/health`                       | Public health check                                |
| POST   | `/auth/login`                   | Public login                                       |
| POST   | `/auth/signup`                  | Public self-registration                           |
| GET    | `/auth/verify-email`            | Public one-time email verification                 |
| POST   | `/auth/resend-verification`     | Public verification resend                         |
| POST   | `/auth/password-reset/request`  | Public reset request with non-enumerating response |
| POST   | `/auth/password-reset/complete` | Public reset completion                            |
| POST   | `/auth/refresh`                 | Validate and rotate a refresh token                |
| POST   | `/auth/logout`                  | Authenticated session termination                  |
| GET    | `/auth/me`                      | Current authenticated account                      |

## Users, patients, and academic periods

| Method | Path                                     | Purpose                                  |
| ------ | ---------------------------------------- | ---------------------------------------- |
| GET    | `/users`                                 | Paginated user administration            |
| GET    | `/users/roles`                           | Role and permission catalogue            |
| GET    | `/users/:id`                             | User detail                              |
| POST   | `/users`                                 | Create user                              |
| PATCH  | `/users/:id`                             | Update user                              |
| DELETE | `/users/:id`                             | Deactivate user                          |
| POST   | `/users/:id/roles`                       | Assign roles                             |
| GET    | `/patients/me`                           | Patient profile linked to caller         |
| GET    | `/patients`                              | Filtered patient registry                |
| GET    | `/patients/:id`                          | Patient detail and health record         |
| PUT    | `/patients/:id/health-record`            | Create or update long-term health record |
| POST   | `/patients`                              | Create patient                           |
| PATCH  | `/patients/:id`                          | Update patient                           |
| POST   | `/patients/:id/archive`                  | Archive patient                          |
| POST   | `/patients/:id/restore`                  | Restore patient                          |
| POST   | `/patients/:id/documents`                | Attach private patient document          |
| GET    | `/academic-years`                        | List academic years and semesters        |
| POST   | `/academic-years`                        | Create academic year                     |
| POST   | `/academic-years/semesters`              | Create semester                          |
| POST   | `/academic-years/:id/activate`           | Activate academic year                   |
| POST   | `/academic-years/semesters/:id/activate` | Activate semester                        |

## Scheduling and clinical care

| Method   | Path                              | Purpose                                                  |
| -------- | --------------------------------- | -------------------------------------------------------- |
| GET      | `/appointments`                   | Upcoming appointments                                    |
| POST     | `/appointments`                   | Book appointment                                         |
| PATCH    | `/appointments/:id/status`        | Validated status transition                              |
| POST     | `/appointments/:id/check-in`      | Atomically check in and create linked visit              |
| POST     | `/appointments/:id/reschedule`    | Create linked replacement and retire original            |
| POST     | `/appointments/:id/cancel`        | Cancel with optional reason                              |
| POST     | `/appointments/:id/no-show`       | Mark no-show                                             |
| GET      | `/clinic-visits/queue`            | Today's active queue                                     |
| GET      | `/clinic-visits/:id`              | Visit with clinical and dispensing detail                |
| POST     | `/clinic-visits`                  | Create walk-in visit and queue number                    |
| POST     | `/clinic-visits/:id/vital-signs`  | Record validated observations                            |
| POST     | `/clinic-visits/:id/consultation` | Add consultation, diagnoses, treatments and prescription |
| PATCH    | `/clinic-visits/:id/status`       | Validated visit transition                               |
| POST     | `/clinic-visits/:id/complete`     | Complete only with required clinical records             |
| GET/POST | `/emergencies`                    | List/create emergency cases                              |
| GET/POST | `/certificates`                   | List/issue medical certificates                          |
| GET/POST | `/health-records/vaccinations`    | List/record external vaccination history                 |
| GET/POST | `/health-records/screenings`      | List/record screenings                                   |

## Requirements, evidence, and clearances

| Method   | Path                                 | Purpose                                 |
| -------- | ------------------------------------ | --------------------------------------- |
| GET/POST | `/requirements`                      | List/create period-bound requirements   |
| POST     | `/evidence/submissions`              | Submit own private requirement evidence |
| GET      | `/evidence/submissions`              | Ownership-scoped or clinical listing    |
| GET      | `/evidence/submissions/:id`          | Authorized submission detail            |
| GET      | `/evidence/submissions/:id/history`  | Status history                          |
| GET      | `/evidence/submissions/:id/document` | Authorized private download             |
| POST     | `/evidence/submissions/:id/review`   | Clinical approval or rejection          |
| GET      | `/clearances`                        | Clinical clearance list                 |
| GET      | `/clearances/mine`                   | Caller-linked requests                  |
| GET      | `/clearances/eligibility/me`         | Caller eligibility                      |
| GET      | `/clearances/eligibility/:patientId` | Clinical eligibility evaluation         |
| POST     | `/clearances`                        | Clinical creation                       |
| POST     | `/clearances/request`                | Self-service request                    |
| POST     | `/clearances/:id/submit`             | Submit complete draft for review        |
| POST     | `/clearances/:id/review`             | Approve or reject                       |
| POST     | `/clearances/:id/archive`            | Archive terminal application            |

## Inventory, communications, reports, and audit

| Method | Path                                                         | Purpose                                              |
| ------ | ------------------------------------------------------------ | ---------------------------------------------------- |
| GET    | `/inventory/medicines`                                       | Stock and batch state                                |
| POST   | `/inventory/medicines`                                       | Create medicine                                      |
| POST   | `/inventory/stock-in`                                        | Record batch stock-in                                |
| GET    | `/inventory/transactions`                                    | Filtered transaction history                         |
| GET    | `/inventory/dispensing`                                      | Dispensation history                                 |
| GET    | `/inventory/dispensing/exceptions`                           | Dispensing integrity exceptions                      |
| GET    | `/inventory/dispensing/visits/:clinicVisitId/reconciliation` | Prescription/dispensing reconciliation               |
| POST   | `/inventory/dispensing`                                      | Transactional prescribed dispensing                  |
| GET    | `/announcements`                                             | Published items for all roles; drafts for publishers |
| POST   | `/announcements`                                             | Draft announcement                                   |
| POST   | `/announcements/:id/publish`                                 | Publish and notify selected audience                 |
| GET    | `/notifications`                                             | Current user's notifications                         |
| POST   | `/notifications/read-all`                                    | Mark current user's notifications read               |
| POST   | `/notifications/:id/read`                                    | Mark owned notification read                         |
| GET    | `/reports/summary`                                           | Dashboard aggregate summary                          |
| GET    | `/reports/operational`                                       | Filtered aggregate report                            |
| POST   | `/reports/operational/export`                                | Permission-controlled audited aggregate CSV          |
| GET    | `/audit-logs`                                                | Administrator audit query                            |
| GET    | `/documents/:id`                                             | Authorized document metadata                         |
| GET    | `/documents/:id/content`                                     | Authorized private content                           |
| DELETE | `/documents/:id`                                             | Retention-aware deletion                             |

## Alignment rules

- Add `@ApiOperation`, response metadata, `@Roles`, and `@Permissions` to every protected controller method.
- Update this file in the same change as any route addition/removal. `api-documentation-alignment.spec.ts` compares its route table with active controller metadata.
- Never document `apps/api/quarantine` routes as active.
- Detailed schemas and current status codes belong to generated Swagger; this file supplies stable workflow context.
