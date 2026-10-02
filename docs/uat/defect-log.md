# Task 27 — UAT defect log

## Severity and state

- **Sev-1:** privacy, data integrity, security, or entire critical journey blocked; release stop.
- **Sev-2:** a P0 scenario has no safe workaround; acceptance stop for that workflow.
- **Sev-3:** material problem with a safe workaround.
- **Sev-4:** cosmetic or low-impact issue.
- States: Open, Fix in progress, Ready for retest, Closed, Deferred (requires named owner and approval).

| ID          | Sev | Scenario | Finding                                                                                                                                                          | Resolution                                                                                                                                                                                                                             | Retest                                                                                                                                                               | State  |
| ----------- | --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| UAT-DEF-001 | 2   | UAT-11   | GET `/announcements` required publisher privileges although the policy and regression contract require every authenticated role to read published announcements. | The read endpoint now requires `announcements.read`; student/faculty roles receive that permission; the service filters drafts unless the caller is a publisher. Added service tests for published-only and publisher history queries. | 2026-10-02: focused authorization/communications/policy run passed 134/134 tests; full API run passed 452/452; frontend run passed 50/50; API and web builds passed. | Closed |

## New defect template

| Field             | Required detail                                                |
| ----------------- | -------------------------------------------------------------- |
| ID and title      | Stable identifier and concise observed failure                 |
| Scenario/step     | UAT scenario and exact step                                    |
| Severity          | 1–4 using the definitions above                                |
| Environment/build | Commit SHA, URL, browser, and role                             |
| Expected/actual   | Observable outcomes, without secrets or PHI                    |
| Reproduction      | Minimal deterministic steps                                    |
| Evidence          | Sanitized screenshot, response, audit/event ID, or test output |
| Owner and target  | Named coordinator and planned fix/retest date                  |
| Fix and retest    | Fix commit, tester, date/time, result, and regression scope    |
