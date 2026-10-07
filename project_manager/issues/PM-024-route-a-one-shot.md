<!-- gh-labels: type:build,area:llm,area:backend,agent:ready | gh-milestone: M2 Filtering & Reconstruction -->
# PM-024: Route A — one-shot review of retained clinical text

| Field | Value |
|---|---|
| Type | Build + Test + Eval |
| Milestone | M2 Filtering & Reconstruction |
| Depends on | PM-021, PM-022 |
| Blocks | PM-026 |
| v4 refs | §4 "Route A" |

## Scope

1. Stage `reconstruction/route_a.py`: send all **retained** passages (with ids, dates, locators as data fields) to the main model in one call; output = evidence records + candidate problem-oriented structure per ADR-003 schema.
2. Pre-check context fit using provider-reported limits (PM-050). If it doesn't fit → run `paused_context_limit` with option to select Route B. **Never truncate.**
3. Output goes through evidence validator (PM-022) before becoming baseline.
4. Record retained input size and usage on the run.

## Test cases

- **T024-1** FakeProvider output with valid evidence → baseline created from validated records only.
- **T024-2** Retained input exceeding limit → paused, zero provider calls, explicit state.
- **T024-3** Output with one invalid record → that record rejected, others accepted; rejection visible in diagnostics.
- **T024-4** Prompt contains no excluded passages (assert on captured request).
- **T024-5** Chart text containing "Ignore previous instructions…" is passed only inside the data field and does not alter the system/instruction section.

## Agent evals

- **AE024-1** `pytest -m eval -k route_a` on Charlie: rubric R1–R11 scores (see `EVALS.md`), tokens, latency, cost.

## Human evals

- [ ] **HE024-1** Clinician spot-checks 3 problems from Route A output for fidelity.
