<!-- gh-labels: type:decision,agent:prep-only,area:product | gh-milestone: M0 Foundations & Decisions -->
# PM-002: Decide v4 operational defaults (cutoff rule, publication, post-cutoff, reschedule)

| Field | Value |
|---|---|
| Type | Decision |
| Milestone | M0 Foundations & Decisions |
| Depends on | – |
| Blocks | PM-003, PM-043, PM-060 |
| v4 refs | §2 step 4, §9, §17 |
| Agent role | **Prep only**: draft options with consequences and test implications |

## Context

v4 §17 lists defaults that are *proposed*, not fixed. Engineering must not settle them implicitly. Each must be decided before the dependent build issue starts.

## Decisions required

| # | Topic | Proposed default (v4) | Alternatives |
|---|---|---|---|
| D1 | Cutoff rule | 72 h before appointment (absolute) | 3 local calendar days (DST/time-zone behavior differs) |
| D2 | Default summarization route | Route B (fragmented) | Route A when retained text fits context |
| D3 | Initial publication | Release baseline + both summaries + question plan together after all validate | Publish each independently |
| D4 | Revised question plan | Supersede old plan's unfinished future sessions, keep history | Keep both active |
| D5 | Conversation active at cutoff | (open) | Allow to finish / end at cutoff / finish within N minutes |
| D6 | Voluntary patient report after cutoff | (open) | Reject / accept into next cycle / accept and create new report version |
| D7 | New records after report issued | (open) | New report version with visible relation / hold until next cycle |
| D8 | Reschedule / cancel | Keep history, recalc cutoff | Cancel → report labelled "not tied to an appointment" |
| D9 | Unknown appointment | Show "cutoff cannot be scheduled" | Allow check-ins with max interval X |
| D10 | Burden limits | (open) | Max questions per session, max sessions per week, repeated-skip policy |
| D11 | Reference-visit selection | (open) | Model proposes + patient/physician confirms; or latest encounter in care context |
| D12 | Unknown historical task status | Remain clarification item | Auto-expire after N months |

## Deliverables

- `project_manager/decisions/ADR-002-operational-defaults.md` with each D# decided (value, rationale, owner, date) or explicitly deferred with the safe interim behavior.
- A table mapping each decision to the issues that implement it (PM-023, PM-031, PM-042, PM-043, PM-060).

## Test cases (implemented by dependent issues; listed here so they are not lost)

- **T002-1** Appointment 21 Mar 2022 10:00 America/New_York → cutoff 18 Mar 2022 10:00 under 72 h rule (PM-043).
- **T002-2** Appointment across a DST transition: cutoff computed per D1 consistently (PM-043).
- **T002-3** Appointment entered inside cutoff window → report prepared, no new scheduled questionnaire (PM-043).
- **T002-4** Reschedule keeps prior report versions and recomputes cutoff (PM-043).
- **T002-5** Cancel → no report labelled "prepared for <cancelled appointment>" (PM-043).
- **T002-6** First-run failure in any of baseline/summary/plan → nothing published (D3) (PM-023).

## Agent evals

- **AE002-1** For each D#, list the code locations that would implement it and any current behavior that contradicts it (e.g. `schedule_previsit` accepts any datetime).

## Human evals

- [ ] **HE002-1** Product + clinical lead sign every D# (or mark deferred with interim behavior).
- [ ] **HE002-2** Dependent issues updated with the decided values.
