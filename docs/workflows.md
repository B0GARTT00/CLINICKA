# Implemented business workflows

## Registration and patient provisioning

Self-registration creates an unverified user with registration metadata, not an immediately usable patient identity. Verification consumes a hashed, expiring one-time token and provisions/links the patient once. Patient numbers use the configured sequence. Clinical staff can create and maintain registry records; students and faculty/staff use `/patients/me` and ownership-scoped services rather than the registry.

Archive hides a patient from active workflows without erasing history; restore reactivates the same identity. See `patient-registration.md` and `patient-self-service-authorization.md`.

## Appointments, walk-ins, and visits

Appointment capacity is validated by type, duration, clinician, patient overlap, and configured concurrency. Rescheduling creates a replacement linked to the terminal original. Same-day check-in atomically creates one linked clinic visit. Walk-ins create visits directly. A patient cannot hold a second active visit in today's queue.

Queue numbers increase within the clinic day. Consultation entry advances an open visit to `IN_CONSULTATION`. Completion requires that state plus at least one vital-sign record and consultation. Terminal visits reject new clinical entries. See `scheduling-engine-spec.md`, `visit-state-machine.md`, and `clinic-visit-lifecycle.md`.

## Requirements, evidence, and clearance

Requirements belong to an academic year and optionally a semester and population. A student/faculty user uploads evidence only for the patient linked to their account; documents are private and ownership-checked. A rejected submission may be replaced, while status history and reviewer attribution remain.

When a student, faculty member, or staff member verifies a new account, CLINICKA first attempts to adopt an existing unlinked manual patient record. Matching uses the verified institutional email together with the Student ID or Employee ID. A consistent match preserves the existing clinical history and links the account; conflicting identifiers require clinic review and never create a second patient automatically.

Clearance eligibility is deterministic over the active/specified academic period, patient type, applicable requirements, evidence status, and expiry. Incomplete applications cannot be issued. Submission re-evaluates evidence; approval re-evaluates again and captures the issuance context. Decisions notify the linked patient. Only terminal clearances can be archived. See `academic-period-policy.md`, `patient-evidence-spec.md`, and `eligibility-engine-spec.md`.

## Vaccination history and screening

Vaccination records document externally received history; CLINICKA does not claim the school clinic administered those doses. History includes the received date and optional provider/source metadata. It does not replace requirement evidence or the clearance decision. Screenings are clinic-recorded assessments with distinct permissions. See `vaccination-history-scope.md`.

## Inventory and dispensing

Medicines hold expiry-dated batches. Stock-in writes both batch quantity and an inventory transaction. Stock state excludes expired stock and identifies low/out-of-stock medicines. Dispensing requires an active patient, a valid visit/prescription relationship, allowed quantities, and dispensable non-expired batches. The transaction creates the dispensation, item rows, stock movement, audit event, and decrements inventory atomically. Exception and reconciliation endpoints surface mismatches without silently altering history. See `dispensing-integrity-strategy.md`.

## Reports and export

The operational report uses aggregate queries rather than patient lists. Date range is limited to 366 days; approved filters are domain and patient type. Doctors and clinic staff may read aggregates, but only administrators and clinic nurses hold `reports.export`. CSV fields are fixed server-side, omit identifiers and clinical narrative, and every successful export writes an `EXPORT` audit event. See `reporting-and-export.md`.


## Secure clinic messages

Clinic nurses, clinic staff, and doctors can start a private conversation with a patient who has a linked account. Only conversation participants can open the thread. Patients can reply while the conversation is open and patient replies are enabled. Clinic personnel can resolve and reopen their conversations.

The inbox and selected conversation refresh every 20 seconds. Opening a loaded thread, or receiving a new message in the selected thread, updates its read status and clears only that caller's unread clinic-message notifications for that conversation. Outgoing messages do not count as unread. Deleted messages are excluded from inbox previews.

Each message supports one private PDF, JPEG, or PNG attachment up to 5 MB. Uploads are validated by the API and attachments use authenticated document downloads. Download, send, status, and read failures are displayed in the messaging screen. Reply drafts are cleared when switching conversations. Notification previews contain no message content.


## Doctor-specific appointment availability

Appointments now select a doctor, an availability month, an available date, and an available time. Only active accounts assigned the DOCTOR role appear. Clinic nurses and clinic staff configure each doctor's dated sessions under Appointments → Doctor schedules; doctors can view schedules but cannot edit them. Two doctors can have entirely different clinic dates and hours. Separate morning/afternoon sessions represent a break. There are no assumed or seeded doctor hours, recurring weekday rules, or invented doctor names.

All scheduling dates use Asia/Manila. A booking must be in the future and its full duration must fit one active session. Start-time choices are spaced 15 minutes from the session start. Availability excludes active overlapping appointments for that doctor and, after patient selection, overlapping appointments for that patient even with another doctor. Cancelled/no-show/completed/rescheduled appointments do not block times. Booking and rescheduling repeat schedule and overlap checks inside a serializable transaction; conflicting concurrent changes return a retryable conflict. Doctor session writes and bookings lock the same doctor row. Check-in carries the chosen doctor into the linked clinic visit.

Removing hours marks the session inactive and records an audit event. Hours with active overlapping appointments cannot be removed until those bookings are rescheduled or cancelled. Historical appointments stay readable, including previously unassigned appointments; new bookings require a doctor. Legacy unassigned appointments must select a doctor when being rescheduled through the API. Rescheduling a checked-in appointment is prohibited.

Migration: 20261016010000_doctor_availability adds only the DoctorAvailability table and its User relation. It does not modify historical appointments or seed schedules. Confirm both doctors' real dates and hours before entering them. Deploy the migration before starting the updated API. No production database was modified by this development run.
