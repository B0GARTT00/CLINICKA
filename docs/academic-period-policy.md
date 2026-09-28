# Academic-period policy

Academic periods are durable record context, not display settings. Requirements
and clearances keep the academic-year and semester IDs with which they were
created, including after a different period becomes active.

## Date and overlap rules

- `startsAt` must be strictly earlier than `endsAt`.
- Academic years must not overlap another academic year.
- A semester must be fully contained by its academic year.
- Semesters in the same academic year must not overlap. Periods use closed
  ranges, so one semester cannot start at the exact instant another ends.
- A requirement's optional semester must belong to its academic year, and its
  deadline must fall within that semester (or within the year for a year-wide
  requirement).

The service rejects invalid writes with `400` or `409`. Database check
constraints also reject reversed date ranges. Foreign keys use `RESTRICT`, so a
period referenced by historical requirements or clearances cannot be deleted.

## Active-period policy

Exactly zero or one academic year may be active, and exactly zero or one
semester may be active. Activating a semester also activates its owning year and
deactivates every other year and semester in the same transaction. Activating a
year clears the active-semester selection until an administrator explicitly
selects one in that year.

When a request supplies IDs, eligibility uses those periods even if they are no
longer active. When IDs are omitted, eligibility uses the single active year and
semester. It fails closed if no active year exists or legacy data contains more
than one active record; it never selects an arbitrary database row.

The nullable unique `activeKey` columns enforce the singleton rule in MySQL:
the active row owns key `1`, while inactive rows store `NULL`.
