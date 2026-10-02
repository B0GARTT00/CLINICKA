# Task 27 — End-to-end UAT plan

## Purpose and decision rule

This plan validates CLINICKA's connected institutional and clinical workflows in a disposable UAT environment. It is executable by clinic, registrar, and system-administration stakeholders and uses only synthetic identities.

Release acceptance requires all of the following:

- every priority 0 (critical) scenario passes;
- no open severity 1 or severity 2 defect blocks a critical workflow;
- failed scenarios are retested after a fix and the result is recorded;
- the clinic owner, institutional/registrar owner, privacy or records owner, and product owner record a decision in `stakeholder-sign-off.md`.

Automated tests are supporting evidence, not a substitute for stakeholder observation and acceptance.

## Environment and controls

| Item        | Requirement                                                                         |
| ----------- | ----------------------------------------------------------------------------------- |
| Environment | Isolated UAT deployment using a database whose name ends in `_test` or `_uat`       |
| Build       | Immutable commit SHA recorded before execution                                      |
| Browser     | Current supported Chrome or Edge desktop release                                    |
| Data        | Fixtures from `anonymized-test-data.json`; never copy production health information |
| Email       | Sink/test inbox only; no external delivery                                          |
| Documents   | Synthetic text fixture encoded as base64; no real medical document                  |
| Evidence    | Screenshots or response exports must obscure tokens and secrets                     |
| Reset       | Restore the disposable database before the formal run and after destructive retests |

## Participants

| Responsibility                                 | Required representative                                 |
| ---------------------------------------------- | ------------------------------------------------------- |
| Test facilitator and evidence recorder         | QA/product representative                               |
| Registration and institutional checks          | Registrar/student-services representative               |
| Queue, consultation, clearance, and dispensing | Clinic nurse/physician representative                   |
| Privacy and role boundaries                    | Privacy/records or system-administration representative |
| Release decision                               | Product owner/business sponsor                          |

No tester should approve a scenario performed with a role they do not understand operationally.

## Scenario catalogue

Record each observed result in `execution-report.md`. P0 means the workflow must pass before acceptance.

| ID     | Pri | Actor                                | Scenario and expected outcome                                                                                                                                                                                                                                 | Automated evidence                                                    |
| ------ | --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| UAT-01 | P0  | Applicant, registrar                 | Register the synthetic student, verify the one-time email link, and confirm a patient record is created only after verification and linked to that account. Reusing the link must not create another patient.                                                 | `critical-workflows.integration-spec.ts` provisioning scenario        |
| UAT-02 | P0  | Nurse, student                       | Confirm a nurse can find the provisioned patient while a student cannot list the patient registry or audit logs.                                                                                                                                              | authorization integration tests                                       |
| UAT-03 | P0  | Clinic staff                         | Book an appointment, reschedule it, and check in a same-day appointment. The original appointment is retained, the replacement is linked, and check-in creates exactly one linked visit.                                                                      | appointment service/state-machine tests; integration booking scenario |
| UAT-04 | P0  | Clinic staff                         | Register a walk-in. It receives the next queue number, appears once in today's queue, and a second active visit for the same patient is rejected.                                                                                                             | visit lifecycle tests; integration queue scenario                     |
| UAT-05 | P0  | Nurse/doctor                         | Record valid vital signs, consultation findings, diagnosis/treatment, and prescription; complete the visit. Completion before vital signs or consultation must be rejected.                                                                                   | visit lifecycle/state-machine tests                                   |
| UAT-06 | P0  | Nurse                                | Stock a non-expired synthetic medicine batch and dispense the prescribed quantity. Confirm stock decreases once, over-dispensing/duplicate dispensing is rejected, and an audit event is retained.                                                            | inventory/dispensing tests; integration dispensing scenario           |
| UAT-07 | P0  | Registrar/nurse, student             | Create an academic-period requirement. The student uploads synthetic evidence, cannot read another patient's evidence, and sees the submitted status/history.                                                                                                 | evidence and ownership tests                                          |
| UAT-08 | P0  | Nurse, student                       | Review and approve valid evidence. Confirm eligibility changes deterministically; submit the clearance; approve it; confirm issued-by/time and patient notification. Ineligible clearance issuance must be rejected.                                          | eligibility, evidence, and clearance service tests                    |
| UAT-09 | P1  | Nurse                                | Reject an evidence or clearance request with remarks, replace/re-submit evidence, and verify full status history remains available.                                                                                                                           | evidence/clearance state-machine tests                                |
| UAT-10 | P0  | Admin, nurse, doctor, staff, student | Open the operational report with each clinical/reporting role and confirm counts match created patients, today's visits, completed visits, upcoming appointments, requirements, clearances, medicine, and low stock. Student/faculty access must be denied.   | report authorization test; formal data reconciliation is manual       |
| UAT-11 | P0  | All roles                            | Execute the role matrix: authorized functions succeed; patient, audit, clinical, evidence, document, inventory, report, and announcement boundaries return 403/404 as designed. Published announcements are readable by all roles; drafts are publisher-only. | `authorization-forbidden.spec.ts` and permission-policy tests         |
| UAT-12 | P0  | QA                                   | Re-run the automated API, web, build, and database-backed integration suites after all fixes. No regression may remain in a critical workflow.                                                                                                                | commands in the execution report                                      |

## Execution procedure

1. Record the commit SHA, deployment URL, database identifier suffix, browser version, participants, and start time.
2. Reset the disposable database and seed only the anonymized fixture set.
3. Execute UAT-01 through UAT-11 in order because later scenarios reuse records created earlier.
4. For every step, record actual outcome, evidence reference, tester, timestamp, and Pass/Fail/Blocked. Never record Pass from expectation alone.
5. Log deviations in `defect-log.md`. Severity 1 blocks the entire session; severity 2 blocks the affected P0 scenario.
6. After a fix, record its commit, repeat the failed scenario, and then run UAT-12.
7. Obtain independent decisions in `stakeholder-sign-off.md`. A blank or pending row is not acceptance.

## Commands for automated evidence

```powershell
npm.cmd run test --workspace @bchealth/api -- --runInBand
npm.cmd run test:frontend
npm.cmd run build
$env:TEST_DATABASE_URL = 'mysql://USER:PASSWORD@HOST:3306/clinicka_uat'
npm.cmd run test:integration
```

The integration database safety guard currently requires a MySQL database name ending in `_test`; use `clinicka_uat_test` unless the guard is deliberately extended and reviewed.
