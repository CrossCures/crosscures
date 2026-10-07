<!-- gh-labels: type:build,area:web,area:feedback,agent:ready | gh-milestone: M6 Physician Feedback -->
# PM-062: Physician feedback UI (flags + end-of-visit form)

| Field | Value |
|---|---|
| Type | Design-lite (screens in PR) + Build + Test |
| Milestone | M6 Physician Feedback |
| Depends on | PM-061, PM-032 |
| Blocks | PM-071 |
| Spec | `specs/physician_feedback_v2.md` "Capture design" |

## Scope

1. **Flag as inaccurate** control on section, subproblem, statement, and (per ADR-060 F4) citation — available inside/next to the source preview; optional free text; one click to save; undo/withdraw.
2. Visual states: pending, saved, failed (with retry, unsent response preserved locally).
3. **End-of-visit form** (trigger per ADR-060 F2): completeness Yes/No + optional "what was missing", utility single choice (No impact / Saved time / Changed my approach), one Save; every field skippable; never blocks report access.
4. "Mark as reviewed" remains separate from feedback.
5. Keyboard + touch accessible; works at 390 px.

## Test cases

- **T062-1** Flag saves with zero text input (one action).
- **T062-2** Network failure → "Not saved — retry" with the response preserved; retry succeeds once (same submission token).
- **T062-3** Form with only utility answered → completeness remains unanswered in request payload.
- **T062-4** Report remains fully usable while feedback save fails.
- **T062-5** Opening/acknowledging report sends no completeness/utility request (network spy).
- **T062-6** Flag control reachable by keyboard from the statement and from the source preview.
- **T062-7** axe 0 serious violations.

## Agent evals

- **AE062-1** Screenshots: flag inline, flag in preview, saved/failed states, end-of-visit form desktop + 390 px.

## Human evals

- [ ] **HE062-1** Physician completes end-of-visit form in ≤ 3 interactions and ≤ 15 s.
- [ ] **HE062-2** Physician confirms flag control doesn't interfere with reading.
