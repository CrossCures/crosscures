<!-- gh-labels: type:build,area:web,area:ux,agent:ready | gh-milestone: M3 Summaries & Follow-ups -->
# PM-032: Physician report UI v2 + accessible source preview window

| Field | Value |
|---|---|
| Type | Build + Test |
| Milestone | M3 Summaries & Follow-ups |
| Depends on | PM-031 |
| Blocks | PM-062 |
| v4 refs | §6, §9, §14; user addition (temporary hover window); ADR-030 |

## Scope

1. New physician report page (replace or evolve `pages/physician/brief-detail.tsx`) implementing ADR-030 IA: header, opening brief, expandable problems, med reconciliation, results tables, timeline (desktop matrix; narrow per-problem view).
2. `SourcePreview` component per ADR-030 interaction spec (hover/focus/click/tap; stays open while inside; closes on leave/Esc; full-height sheet on narrow screens; multiple sources; image + OCR text; patient-report view with correction history; explicit error state).
3. Version banner when newer version exists; viewing an old version shows its date clearly.
4. Acknowledge action retained but labelled "Mark as reviewed" (does not certify correctness; does not submit feedback).
5. DOM ids/data attributes for section/statement/citation ids (feedback hooks for PM-062).

## Test cases (vitest + testing-library; Playwright for pointer tests if needed)

- **T032-1..5** Implement T030-1..T030-5.
- **T032-6** Citation for patient report opens answer view with date and correction history.
- **T032-7** Source fetch error → error message; no other source shown.
- **T032-8** Results table: order rows show "Ordered – result not found in available chart" styling distinct from results.
- **T032-9** Viewing v1 when v2 exists shows banner + link; content remains v1.
- **T032-10** axe: 0 serious violations; all interactive elements keyboard-reachable.

## Agent evals

- **AE032-1** Screenshots (1280/390) of Charlie report: brief, finger problem expanded, results table, source preview open.
- **AE032-2** Short screen recording or GIF of hover → move into preview → scroll → leave.

## Human evals

- [ ] **HE032-1** Clinician uses report with Charlie: opens 5 sources by hover and 2 by keyboard; finds all needed evidence.
- [ ] **HE032-2** Reviewer confirms preview never occludes the statement being checked in a way that blocks reading.
