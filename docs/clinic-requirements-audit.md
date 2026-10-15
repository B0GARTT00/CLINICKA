# Clinic requirements audit and implementation

The October 2026 clinic update was reviewed against Requirements, clearance eligibility, Reports, Patient Profile, academic configuration, Inventory and Dispensing.

## Existing behavior

- HealthRequirement already stores patient scope, department/program/year targets and academic year/semester. Submissions reference requirements and clearances store eligibility snapshots.
- Patient profiles hold DOB, sex, course, department and employee position. Visits, consultations, diagnoses, treatments and prescriptions already contain logbook data.
- Dispensing stores immutable item quantities linked to batches and medicines; reporting must never alter stock.
- Reports provide aggregate operational counts and nurse-only audited CSV export. They do not provide distinct patients, time buckets, medicine quantities or a logbook.
- Academic periods have strict parent/child and activation invariants. Visits have dates, not direct academic period IDs.

## Decisions and risks

- No schema changes or database migration are required. Use existing requirement records as scoped, period-specific templates. New configuration must not overwrite submissions or clearance snapshots.
- Replace only the known legacy demo laboratory configuration, by archiving it and creating new period-specific records. Never delete historical rows. Do not run the full demo seed on a real clinic database.
- The Medicine program is currently catalogued under Graduate School. Target Doctor of Medicine by program ID; do not assign requirements to the entire Graduate School. Other Graduate School, BED and CDC programs receive no seeded laboratory template.
- Use four confirmed tests for SBISM/SASE and seven items for Allied Health/Nursing/Medicine. Item seven is explicitly pending confirmation, not an invented test.
- Faculty/staff remains manually assigned by the clinic/HR workflow. Do not automatically apply age-based tests before HR confirms assignment policy. Policy reference: age <=34 uses four, >=35 uses seven; no age calculation is added to frontend pages.
- Report academic filters mean intersection with visit/dispensing dates, not proof of enrollment. Department/course refer to current patient affiliations because historical affiliation snapshots are not stored.
- Report days and week/month boundaries use Asia/Manila; weeks start Monday. All selected-range totals include stored visits, including cancelled/archived visits, without silently changing the historical population.
- Aggregate exports reuse auditing. The identifiable logbook requires clinical and report permissions; export additionally requires the existing export permission. Admin-only accounts remain excluded.

## Open clinic questions

Confirm the seventh test and its final name; HR's annual PE assignment workflow and policy ownership; and whether accreditation requires historical department affiliation snapshots or a different week start convention.


## Delivered files and verification

- Laboratory configuration: prisma/clinic-laboratory-config.ts, prisma/configure-clinic-laboratories.ts and prisma/seed.ts. The active local 2026-2027 / First Semester was configured with 29 scoped items. The script defaults to a dry run and can be rerun idempotently with --apply. No full demo reseed was run.
- Applicability: apps/api/src/requirements/applicability.ts is shared by the catalogue and clearance eligibility engine. Existing period checks, submission relations and clearance snapshots remain intact.
- Reports API: apps/api/src/reports/clinic-reports.service.ts, reports.controller.ts, reports.module.ts and dto.ts. Adds options, utilization, medicine-summary and logbook endpoints plus audited CSV exports. Logbook screens use server pagination (25 visits); exports require narrower filters above 5,000 visits.
- Reports UI: apps/web/src/pages/ClinicReportsPage.tsx, existing ReportsPage.tsx, services/api.ts and routes/router.tsx. Reuses the shared MUI DataTable. Existing operational report remains available as a tab. Clearances now links clinic nurses to the existing requirement configuration form at /requirements/configuration; administrator-only accounts cannot open it.
- Tests: clinic-reports.service.spec.ts, clinic-laboratories.spec.ts, evidence.service.spec.ts, authorization-forbidden.spec.ts, ClinicReportsPage.test.tsx and existing report tests. Covers 4/7 test groups, unmatched groups, manual HR policy, historical evidence, distinct counts, week/month boundaries, filters, logbook mappings, CSV formula escaping, export auditing and authorization.
- Verification: Prisma validation, API/web TypeScript checks, Nest build, Vite production build, API/web lint and git diff --check passed. Affected backend suite: 223 tests passed. Affected frontend suite: 15 tests passed. Real local MySQL queries for utilization, medicine summaries and logbook succeeded. No Prisma schema changes or migration required.
- Existing Vite large-chunk warning remains. UI behavior was checked with component tests; no browser visual review was performed for this change.
