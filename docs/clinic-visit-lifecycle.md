# Clinic Visit Lifecycle

The active visits API uses the following state machine for every clinic visit:

```text
OPEN ──► IN_CONSULTATION ──► COMPLETED
  │              │
  └──────────────┴────────► CANCELLED
```

`COMPLETED` and `CANCELLED` are terminal states. A visit cannot return to the
queue, and no later vital-sign or consultation record can be added.

## Completion requirements

A visit may move from `IN_CONSULTATION` to `COMPLETED` only after the
longitudinal record contains both:

1. at least one vital-sign record; and
2. at least one consultation.

The API rejects an invalid transition or an incomplete completion request with
HTTP 422 and a clear explanation. Every state transition is audited against the
acting user with `from` and `to` values in audit metadata.
