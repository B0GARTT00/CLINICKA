# Implemented business workflows

## Registration and patient provisioning

Self-registration creates an unverified user with registration metadata, not an immediately usable patient identity. Verification consumes a hashed, expiring one-time token and provisions/links the patient once. Patient numbers use the configured sequence. Clinical staff can create and maintain registry records; students and faculty/staff use `/patients/me` and ownership-scoped services rather than the registry.

Archive hides a patient from active workflows without erasing history; restore reactivates the same identity. See `patient-registration.md` and `patient-self-service-authorization.md`.

## Appointments, walk-ins, and visits

Appointment capacity is validated by type, duration, clinician, patient overlap, and configured concurrency. Rescheduling creates a replacement linked to the terminal original. Same-day check-in atomically creates one linked clinic visit. Walk-ins create visits directly. A patient cannot hold a second active visit in today's queue.

Queue numbers increase within the clinic day. Consultation entry advances an open visit to `IN_CONSULTATION`. Completion requires that state plus at least one vital-sign record and consultation. Terminal visits reject new clinical entries. See `scheduling-engine-spec.md`, `visit-state-machine.md`, and `clinic-visit-lifecycle.md`.

## Requirements, evidence, and clearance

Requirements belong to an academic year and optionally a semester and population. A student/faculty user uploads evidence only for the patient linked to their account; documents are private and ownership-checked. A rejected submission may be replaced, while status history and reviewer attribution remain.

Clearance eligibility is deterministic over the active/specified academic period, patient type, applicable requirements, evidence status, and expiry. Incomplete applications cannot be issued. Submission re-evaluates evidence; approval re-evaluates again and captures the issuance context. Decisions notify the linked patient. Only terminal clearances can be archived. See `academic-period-policy.md`, `patient-evidence-spec.md`, and `eligibility-engine-spec.md`.

## Vaccination history and screening

Vaccination records document externally received history; CLINICKA does not claim the school clinic administered those doses. History includes the received date and optional provider/source metadata. It does not replace requirement evidence or the clearance decision. Screenings are clinic-recorded assessments with distinct permissions. See `vaccination-history-scope.md`.

## Inventory and dispensing

Medicines hold expiry-dated batches. Stock-in writes both batch quantity and an inventory transaction. Stock state excludes expired stock and identifies low/out-of-stock medicines. Dispensing requires an active patient, a valid visit/prescription relationship, allowed quantities, and dispensable non-expired batches. The transaction creates the dispensation, item rows, stock movement, audit event, and decrements inventory atomically. Exception and reconciliation endpoints surface mismatches without silently altering history. See `dispensing-integrity-strategy.md`.

## Reports and export

The operational report uses aggregate queries rather than patient lists. Date range is limited to 366 days; approved filters are domain and patient type. Doctors and clinic staff may read aggregates, but only administrators and clinic nurses hold `reports.export`. CSV fields are fixed server-side, omit identifiers and clinical narrative, and every successful export writes an `EXPORT` audit event. See `reporting-and-export.md`.
