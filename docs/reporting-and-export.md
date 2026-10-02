# Reporting and controlled export

CLINICKA's operational report is an aggregate decision-support view. It is deliberately separate from the dashboard and does not retrieve or export patient names, patient numbers, complaints, diagnoses, consultation notes, document contents, prescription details, or other clinical narrative.

## Access model

| Capability | Authorized roles | Permission |
| --- | --- | --- |
| View aggregate operational reports | Administrator, clinic nurse, doctor, clinic staff | `reports.read` |
| Export aggregate CSV | Administrator, clinic nurse | `reports.export` |

The API enforces both the role and permission. UI visibility is only a convenience and is not the security boundary.

## Approved filters

- Inclusive start and end date, limited to 366 days
- Domain: all approved domains, clinical operations, requirements and clearances, or inventory
- Patient type: all, student, faculty, or staff; not applicable to inventory totals

Invalid enum values, malformed dates, reversed ranges, and ranges over 366 days are rejected by the API.

## Returned and exported fields

The report contains only filter context and aggregate counts:

- active patient count;
- clinic visits, completed visits, and appointments;
- evidence submitted and verified;
- clearances requested and issued;
- medicine, low-stock, and inventory-transaction counts.

The CSV is produced server-side from the same filtered aggregate query used by the UI. The client cannot request additional columns.

## Audit behavior

Every successful export writes an `EXPORT` audit event with:

- authenticated actor ID and event timestamp;
- entity `Report` and report identifier `operational-summary`;
- output format;
- applied period, domain, and patient-type filters;
- names of the aggregate fields included.

The audit metadata intentionally excludes generated counts and all patient or clinical information. Denied attempts return HTTP 403 and do not generate a file.
