# Patient self-service authorization

Patient ownership is enforced by the API service that loads the resource. UI
route hiding is not an authorization boundary.

## Endpoint map

| Endpoint | Patient-facing behavior | Clinical behavior |
| --- | --- | --- |
| `GET /patients/me` | Resolves the patient from the authenticated user; accepts no patient identifier. | Not a clinical workflow. |
| `POST /evidence/submissions` | Uses the authenticated user's linked `patientId`; the body cannot select a patient. | Reviews use the separate protected review endpoint. |
| `GET /evidence/submissions` | Scoped to the linked patient. A different `patientId` query is rejected. | May list all submissions or filter by patient. |
| `GET /evidence/submissions/:id` | The loaded submission must belong to the linked patient. | May read any patient submission. |
| `GET /evidence/submissions/:id/history` | The loaded submission must belong to the linked patient. | May read any patient submission history. |
| `GET /evidence/submissions/:id/document` | Both evidence ownership and private-document ownership are checked. | May read documents required for clinical work. |
| `GET /documents/:id` and `/content` | The loaded private document must belong to the linked patient. | May read any patient document required for clinical work. |
| `GET /requirements` | Returns requirement definitions, not patient submissions or records. | Returns the same catalogue. |

Clearance, visit, screening, vaccination, appointment, certificate, and direct
patient-ID routes are currently restricted to clinic roles. If one becomes a
self-service route, it must call `assertPatientOwnership` after resolving the
resource's patient ID; accepting a patient identifier from the request alone is
not sufficient.

## Policy

- `STUDENT` and `FACULTY_STAFF` accounts require a linked patient record and an
  exact match between that link and the resource owner.
- `ADMINISTRATOR`, `CLINIC_NURSE`, `CLINIC_STAFF`, and `DOCTOR` retain
  role-authorized cross-patient access.
- Missing links, unexpected roles, and identifier substitution are rejected.
- Ownership checks run in services beside database access, even when a
  controller already restricts roles and permissions.
