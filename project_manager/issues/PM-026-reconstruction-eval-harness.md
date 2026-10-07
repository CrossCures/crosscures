<!-- gh-labels: type:eval,area:llm,area:testing,agent:ready | gh-milestone: M2 Filtering & Reconstruction -->
# PM-026: Reconstruction eval harness (Charlie corrected rubric, route comparison)

| Field | Value |
|---|---|
| Type | Eval tooling + Test |
| Milestone | M2 Filtering & Reconstruction |
| Depends on | PM-004, PM-024 (can start with a stub route) |
| Blocks | PM-071; regression gate for any prompt/model change |
| v4 refs | §6 last para, §15 "Source accuracy", Appendix A |

## Scope

1. `tests/evals/reconstruction/` runner: given patient fixture + route + provider config → run pipeline → score against `expected_facts.yaml` (R1–R11) with:
   - **Deterministic checks**: must-not-appear strings/values (e.g. "23" as vitamin D value, AST/ALT "20/19"), exact value/unit matches, citation resolvability + scope.
   - **LLM-as-judge** (separate model from generator, pinned prompt) for semantic items (e.g. "current status unknown" phrasing) with rationale stored.
2. JSON + Markdown report in `tests/evals/results/<date>_<route>_<model>.{json,md}`: per-rubric pass/fail, coverage of retained passages, tokens, cost, latency, validator rejections.
3. Route comparison mode: same filter version + inputs for A and B (v4: comparison must be about summarization, not coverage).
4. CLI: `python -m tests.evals.reconstruction --patient charlie --route B --runs 3` (multiple runs report variance).
5. CI: deterministic part runs on every PR with FakeProvider fixtures; real-model eval runs on label `run-evals` or nightly.

## Test cases

- **T026-1** Scorer unit tests: synthetic output containing "vitamin D 23 ng/mL" → R5 fail.
- **T026-2** Synthetic output with uncited claim → R11 fail.
- **T026-3** Synthetic perfect output → all pass.
- **T026-4** Report files written with schema-valid JSON.

## Agent evals

- **AE026-1** Baseline report for Route A and Route B (3 runs each) attached; variance stated.
- **AE026-2** Judge agreement: on 20 items, judge vs human label agreement reported.

## Human evals

- [ ] **HE026-1** Clinician validates judge verdicts on a sample of 20 items (≥ 90 % agreement required to trust judge).
- [ ] **HE026-2** Team agrees thresholds become a merge gate for prompt/model changes.
