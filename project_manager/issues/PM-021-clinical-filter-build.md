<!-- gh-labels: type:build,area:llm,area:backend,agent:ready | gh-milestone: M2 Filtering & Reconstruction -->
# PM-021: Build shared clinical filtering stage + inspection record

| Field | Value |
|---|---|
| Type | Build + Test + Eval |
| Milestone | M2 Filtering & Reconstruction |
| Depends on | PM-020 (approved), PM-023 |
| Blocks | PM-024, PM-025 |
| v4 refs | §4, §15 "Complete coverage", "Both analysis routes" |

## Scope

1. `crosscures_v2/filtering/` stage implementing ADR-020: deterministic pre-rules → model classification → schema validation → reconciliation with snapshot passage set.
2. Persist `PassageDisposition` per run with reason, label, confidence, classifier/prompt/model version.
3. Threshold settings adjustable per run (exposed later in PM-051 workspace) — low score alone never excludes clinical-labelled text.
4. Inspection API: `GET /internal/runs/{run_id}/filtering` returns retained/excluded/ambiguous with source locators.
5. Metrics: retained token count vs total, provider usage (from audit) — no unsupported savings claims.
6. Both Route A and Route B consume **only** the filter output (enforced in PM-023 orchestration; add assertion here).

## Test cases

- **T021-1..4** Implement T020-1..T020-4 using FakeProvider scripted outputs (deterministic).
- **T021-5** Malformed classifier JSON → run status `paused_filter_invalid`; no downstream stage invoked; no unfiltered fallback (assert route never receives excluded passages).
- **T021-6** Classifier omits a passage id → reconciliation fails → paused.
- **T021-7** Classifier returns passage id from Dana's snapshot → rejected as isolation failure.
- **T021-8** Every excluded passage has a non-empty reason and resolvable locator.
- **T021-9** Changing threshold creates a new filter version on next run; previous run's dispositions unchanged.

## Agent evals

- **AE021-1** `pytest -m eval -k filter`: real model on labeled set; report clinical recall (target ≥ 0.98), exclusion precision, token reduction, cost per chart.
- **AE021-2** List every false exclusion of clinical text with passage excerpt.

## Human evals

- [ ] **HE021-1** Clinician reviews the inspection view output for Charlie: no clinician plan, result, or individualized instruction excluded.
- [ ] **HE021-2** Reviewer confirms no route can run without a completed filter result (code read).
