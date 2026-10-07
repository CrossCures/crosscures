<!-- gh-labels: type:test,area:backend,security,area:testing,agent:ready | gh-milestone: M7 Hardening & Acceptance -->
# PM-070: Patient isolation adversarial test suite

| Field | Value |
|---|---|
| Type | Test (+ fixes for any failures found) |
| Milestone | M7 Hardening & Acceptance (start as soon as PM-023 lands; extend as features merge) |
| Depends on | PM-023 |
| Blocks | PM-071 |
| v4 refs | §12 "Isolation throughout the workflow", §15 "Isolation" |

## Scope

Systematic tests with Charlie and Dana (overlapping dates + similar text) across every patient-scoped surface. Fix any leak found (or file P0 issue if large).

| Surface | Attack |
|---|---|
| REST routes (all routers) | Dana's token / unlinked physician requests Charlie's ids (documents, snapshots, passages, runs, reports, summaries, tasks, sessions, answers, feedback, sources) |
| Model outputs | Evidence/citation/question ids from other patient or other snapshot |
| Run artifacts | Cross-patient artifact lookup by guessed id |
| Notifications / in-app notices | Charlie notice appears in Dana's list |
| Browser patient switch | Physician switches patient mid-request; stale responses must not render under new patient |
| Events | `EventDB` replay filters by patient |
| Exports | Metrics/CSV exclude unauthorized patients |

## Test cases

- **T070-1** Parametrized route test: for every route with a path/query id, wrong-patient access → 403/404 (auto-discovered from FastAPI app routes; fails if a new route lacks a case).
- **T070-2** Fake model returns Dana source id in Charlie run → rejected at validator, run diagnostics show isolation failure.
- **T070-3** Guessed UUID for Dana artifact via Charlie context → 404.
- **T070-4** Web: switching patients aborts in-flight requests; vitest asserts no render of stale patient data.
- **T070-5** Event replay for Charlie never yields Dana events.
- **T070-6** Unlinked physician sees neither patient.

## Agent evals

- **AE070-1** Route coverage report: N routes discovered, N covered, list of exemptions with justification.

## Human evals

- [ ] **HE070-1** Security reviewer reviews exemption list and signs off.
