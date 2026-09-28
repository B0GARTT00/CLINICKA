# Logging privacy, access, and retention

## Application logs

Application logs contain only operational metadata: HTTP method, route template,
status code, duration, error class, and server status. Request headers, cookies,
query strings, route identifiers, request bodies, uploaded content, and clinical
fields are excluded. Unexpected production errors never include messages or
stack traces.

Production application logs must be accessible only to the operations/security
team through authenticated, least-privilege accounts. Do not grant application
log access merely because someone can access patient records in CLINICKA.

Set `APPLICATION_LOG_RETENTION_DAYS` to the approved operational window. The
default policy is 30 days and validation permits 1–365 days. Configure this
retention in the deployment log sink; the API does not delete external logs.

## Audit logs

Audit logs retain actor ID, action, entity, entity ID, timestamp, and safe event
or status-transition context. Passwords, tokens, request payloads, free-text
clinical notes, diagnoses, and similar health data are redacted from optional
JSON fields before persistence.

The `GET /audit-logs` endpoint requires the `ADMINISTRATOR` role and
`audit.read` permission. Database and backup access must be limited to database
administrators and approved security personnel, with access itself monitored.

Set `AUDIT_LOG_RETENTION_DAYS` to the institution's approved compliance period.
The default policy is 2,555 days (seven years), and validation permits 365–3,650
days. This setting documents the policy for deployment tooling; no automatic
destructive purge is performed by the application.

## Incident handling

If a credential or health payload is found in a log, restrict access to the
affected sink, rotate the credential when applicable, preserve the security
incident record, and remove the exposed value according to the approved
incident-response process. Do not paste raw log entries into tickets or chat.
