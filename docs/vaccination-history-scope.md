# Vaccination history scope and UAT terminology

## Approved scope

`VaccinationRecord` is a documentation-only record of a vaccine received from an external provider. BCHealth does not provide vaccine administration, vaccine inventory, vaccination appointments, dose scheduling, or immunization-program management.

The user-facing terms are **External Vaccination History**, **Date received**, and **External provider / source**. The system user who enters a history item is recorded as the history recorder; they are never represented as the administering clinician.

## Requirement-evidence linkage

Vaccination history can help staff identify a relevant record, but it is not itself a requirement submission or proof of compliance. Compliance evidence remains linked through `RequirementSubmission.requirementId`, `RequirementSubmission.patientId`, and its optional evidence `documentId`; a reviewer verifies that evidence through the existing requirement-review workflow.

## UAT terminology sign-off

| Stakeholder | Check | Outcome |
|---|---|---|
| Clinic nursing lead | Confirms that labels describe external history only | Pending UAT approval |
| Registrar / health-requirements owner | Confirms history does not replace requirement evidence | Pending UAT approval |
| Privacy / records owner | Confirms provider/source wording is appropriate | Pending UAT approval |

Approval is pending the designated UAT stakeholders' review; this document provides the exact terminology and scope for that review.
