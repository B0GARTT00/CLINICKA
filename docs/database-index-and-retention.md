# Operational indexes and retention

## Query review

The September 2026 review traced the Prisma calls used by patient lists, the
clinic queue, dashboard reports, notifications, inventory, and private
documents. Composite indexes were added only where the API supplies equality
or bounded-range predicates followed by a stable ordering.

| Operational query | Supporting index |
| --- | --- |
| Active/archived patient list ordered by name | `Patient(archiveStatus, deletedAt, lastName, firstName)` |
| Today's queue and completed-visit report count | `ClinicVisit(status, visitDate, queueNumber)` |
| Latest vital signs included with queue rows | `VitalSign(clinicVisitId, recordedAt)` |
| Upcoming appointments by active status | `Appointment(status, scheduledAt)` |
| Clearances awaiting review | `Clearance(status, updatedAt)` |
| Active medicine catalog ordered by name | `Medicine(deletedAt, name)` |
| A medicine's batches ordered by expiry | `MedicineBatch(medicineId, expiresAt)` |
| Date-only inventory-ledger queries | `InventoryTransaction(createdAt)` |
| A user's newest notifications | `Notification(userId, createdAt)` |
| Newest announcements | `Announcement(createdAt)` |

Existing primary, unique, and foreign-key indexes already cover document lookup,
document ownership, patient identity, inventory batch identity, and transaction
joins. They were retained. No index was added for `contains` patient or medicine
searches: those compile to leading-wildcard `LIKE` predicates and a B-tree would
not serve them. If search volume later warrants it, use a deliberately designed
FULLTEXT search rather than accumulating ineffective indexes.

`scripts/verify-operational-query-plans.sql` creates connection-scoped temporary
tables with 5,000–40,000 representative rows, analyzes them, and runs the
reviewed `EXPLAIN` statements. It never writes to application tables.

## Archive and retention policy

- **Patients:** archive through `archiveStatus` and `deletedAt`; restoration is
  supported. There is no scheduled hard deletion.
- **Visits, requirements, clearances, dispensations, inventory transactions,
  and audit logs:** retain indefinitely until the institution approves a legal
  retention schedule. These records form clinical or accountability history.
- **Academic periods:** referenced years and semesters are deletion-restricted,
  preserving their historical context.
- **Notifications and announcements:** keep under the current bounded API views.
  No automatic purge is introduced by this review.
- **Documents:** linked clinical documents cannot be deleted. An authorized
  manual request may delete an unlinked document only after
  `PRIVATE_STORAGE_RETENTION_DAYS`, when configured. A value of `0` adds no
  waiting period but does not schedule deletion. `purgeUnlinked` is limited to
  compensating cleanup when an evidence upload fails before it is linked.
- **Backups:** database and object-storage backup expiry is an infrastructure
  policy and must be approved together with recovery objectives; this code does
  not delete backups.

Any future purge must be a separately approved, auditable job with a dry-run,
record counts, legal scope, and restore procedure. This task adds no destructive
retention behavior.
