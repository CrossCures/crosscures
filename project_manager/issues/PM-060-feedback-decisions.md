<!-- gh-labels: type:decision,agent:prep-only,area:product,area:feedback | gh-milestone: M6 Physician Feedback -->
# PM-060: Decide physician-feedback open questions

| Field | Value |
|---|---|
| Type | Decision |
| Milestone | M6 Physician Feedback |
| Depends on | PM-002 |
| Blocks | PM-061, PM-062, PM-063 |
| Spec | `specs/physician_feedback_v2.md` "Open questions" |
| Agent role | **Prep only** |

## Decisions required

| # | Question | Options / proposed |
|---|---|---|
| F1 | Which encounters are prompted? | every eligible encounter / sampled (rate?) |
| F2 | What event marks encounter end? | explicit "End-of-visit review" action / appointment time + N hours / both |
| F3 | Unfinished form lifetime | e.g. 7 days, no repeat prompts after 1 reminder |
| F4 | Accuracy control | simple flag (proposed) / flag + scale; citation-level flags in V1? |
| F5 | Utility response | single best choice (proposed) / multi-select |
| F6 | Section exposure definition | substantive content rendered in viewport? expanded? (proposed: rendered expanded content, collapsed headings excluded) |
| F7 | Parent/child counting | child flag doesn't flag parent (proposed) |
| F8 | Multiple physicians / report versions per visit | per (physician, version) episode; rollup rule? |
| F9 | Investigation ownership | who triages flags; where findings recorded; SLA |
| F10 | Link correction to original flag | field on new report version referencing feedback ids |

## Deliverables

- `decisions/ADR-060-feedback.md` with each F# decided or deferred with interim behavior.

## Test cases (implemented in PM-061/063)

- **T060-1** Opening/acknowledging report never creates completeness/utility responses.
- **T060-2** Two citation flags in one section count as one section numerator.
- **T060-3** Skipped completeness stays unanswered (not "No").

## Agent evals

- **AE060-1** For each F#, code impact note on PM-061/062/063.

## Human evals

- [ ] **HE060-1** Product + clinical lead sign F1–F10.
