# Task 27 — UAT execution and retest report

## Run summary

| Field                         | Value                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Run date                      | 2026-10-02 (Asia/Manila)                                                       |
| Workspace                     | Local managed checkout                                                         |
| Commit                        | Record immediately before stakeholder session                                  |
| Formal stakeholder session    | Not yet conducted                                                              |
| Disposable MySQL UAT database | Not configured in this checkout                                                |
| Overall decision              | **Not accepted — formal P0 execution and stakeholder sign-off remain pending** |

This report does not claim human acceptance. It records the automated regression actually executed while preparing the formal UAT pack and leaves the observational fields explicit for the scheduled session.

## Automated execution evidence

| Run       | Command                                                             | Result           | Evidence/findings                                                                                                                                                                                                                  |
| --------- | ------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REG-01    | `npm.cmd test -- --runInBand`                                       | Failed initially | API: 449 passed, 1 failed. Defect UAT-DEF-001: every role was expected to read announcements, but non-publisher roles received 403. Web tests did not start because managed filesystem access blocked esbuild above the workspace. |
| RETEST-01 | focused authorization, communications, and permission-policy suites | Passed           | 3 suites, 134 tests passed after UAT-DEF-001 fix.                                                                                                                                                                                  |
| REG-02    | `npm.cmd run test --workspace @bchealth/api -- --runInBand`         | Passed           | 39 suites, 452 tests passed after the fix.                                                                                                                                                                                         |
| REG-03    | `npm.cmd run test:frontend`                                         | Passed           | 17 files, 50 tests passed outside the managed filesystem sandbox.                                                                                                                                                                  |
| REG-04    | API and web production builds                                       | Passed           | Nest API build passed. Web TypeScript/Vite build passed; Vite reported a non-blocking large-chunk warning.                                                                                                                         |
| E2E-01    | `npm.cmd run test:integration`                                      | Blocked          | `TEST_DATABASE_URL` is not set. The suite deliberately refuses non-disposable databases.                                                                                                                                           |

## Formal scenario results

Complete during the observed UAT session. Evidence IDs should point to sanitized screenshots, API exports, audit IDs, or CI run URLs.

| Scenario                                        | Tester        | Started/completed (Asia/Manila) | Result       | Evidence                                         | Defect/retest                     |
| ----------------------------------------------- | ------------- | ------------------------------- | ------------ | ------------------------------------------------ | --------------------------------- |
| UAT-01 Registration, verification, provisioning | —             | —                               | Not run      | —                                                | —                                 |
| UAT-02 Patient registry and ownership           | —             | —                               | Not run      | —                                                | —                                 |
| UAT-03 Appointment, reschedule, check-in        | —             | —                               | Not run      | —                                                | —                                 |
| UAT-04 Walk-in and queue                        | —             | —                               | Not run      | —                                                | —                                 |
| UAT-05 Consultation and completion              | —             | —                               | Not run      | —                                                | —                                 |
| UAT-06 Prescribed dispensing                    | —             | —                               | Not run      | —                                                | —                                 |
| UAT-07 Requirement evidence                     | —             | —                               | Not run      | —                                                | —                                 |
| UAT-08 Clearance approval                       | —             | —                               | Not run      | —                                                | —                                 |
| UAT-09 Rejection and resubmission               | —             | —                               | Not run      | —                                                | —                                 |
| UAT-10 Reports reconciliation                   | —             | —                               | Not run      | —                                                | —                                 |
| UAT-11 Role-access matrix                       | QA automation | 2026-10-02                      | Partial pass | RETEST-01                                        | UAT-DEF-001 passed focused retest |
| UAT-12 Full regression                          | QA automation | 2026-10-02                      | Blocked      | REG-02..04 passed; E2E-01 needs disposable MySQL | —                                 |

## Acceptance-criteria status

| Criterion                              | Status                               | Required closure evidence                                                     |
| -------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| Critical workflows pass UAT            | Pending                              | P0 rows UAT-01..12 marked Pass with evidence                                  |
| Blocking defects resolved              | Passed for defects found in this run | No open Sev-1/Sev-2 items; UAT-DEF-001 passed focused and full API regression |
| Findings and retest results documented | In progress                          | This report and `defect-log.md`; add final database/web regression results    |
| Stakeholder acceptance recorded        | Pending                              | Completed `stakeholder-sign-off.md`                                           |

## Session notes

- Do not change a `Not run` or `Blocked` result to `Pass` without observed evidence.
- Attach secrets, access tokens, raw verification tokens, and unredacted health information to neither this repository nor the evidence set.
