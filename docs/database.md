# Database architecture and migrations

Prisma targets MySQL through `DATABASE_URL`. `prisma/schema.prisma` is the model source of truth; `prisma/migrations` is the deployable history. The schema is relational and organized around identity/RBAC, patients, care, academic compliance, inventory, communications, documents, and audit.

## Major aggregates

- Identity: `User`, `Role`, `Permission`, joins, and hashed `RefreshToken` records.
- Patient: `Patient`, student/employee profiles, emergency contacts, health record, histories, conditions and allergies.
- Care: `ClinicVisit`, vital signs, consultation, diagnoses, treatments, prescriptions, appointments, emergencies and certificates.
- Academic compliance: academic year, semester, requirement, evidence submission, clearance and eligibility snapshots.
- Health history: external `VaccinationRecord` and clinic `HealthScreening`.
- Supply: medicine, expiry-aware batch, inventory transaction, dispensation and dispensation item.
- Content/control: private document metadata, announcements, notifications, and audit events.

IDs are UUID strings. Statuses use Prisma enums. High-volume access paths have indexes for patient/date/status and inventory expiry/transaction queries. Owned child rows generally cascade; optional attribution links generally set null. Archive behavior is explicit per aggregate: patients/users use `deletedAt`, while requirements/clearances also use `ArchiveStatus`. Do not assume every table supports soft deletion.

Documents store metadata and an opaque storage key in MySQL; content remains in the configured private-storage adapter and is never exposed as a public URL.

## Migration policy

- Never edit an applied migration or use `db push` as a production deployment strategy.
- Develop schema changes with `npm run prisma:migrate`, review generated SQL, and commit schema plus migration together.
- Generate the client after schema or dependency installation with `npm run prisma:generate`.
- Production/CI deployment applies committed migrations non-interactively with `prisma migrate deploy` before the new API receives traffic.
- Back up first for destructive or large transformations. Use expand/backfill/contract across releases when compatibility is required.
- Seed data is for development and tests, never production.
- A failed migration stops deployment; do not start mixed application versions against a partially migrated schema.

Detailed field notes are in `database-documentation.md`, `database-erd.md`, and `database-index-and-retention.md`; when they conflict, the Prisma schema and migrations win.
