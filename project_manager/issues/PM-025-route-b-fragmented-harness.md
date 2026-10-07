<!-- gh-labels: type:build,area:llm,area:backend,agent:ready | gh-milestone: M2 Filtering & Reconstruction -->
# PM-025: Route B — fragmented longitudinal reconstruction harness

| Field | Value |
|---|---|
| Type | Design-lite (stage plan in PR) + Build + Test + Eval |
| Milestone | M2 Filtering & Reconstruction |
| Depends on | PM-021, PM-022 |
| Blocks | PM-031, PM-033, PM-034, PM-040 |
| v4 refs | §4 "Route B", §5 (whole section), Appendix A |

## Scope

Small sequence of backend stages carrying **evidence records**, not shrinking prose:

1. **Anchor**: select most recent relevant substantive note(s) (recency + relevance; acute visit does not erase chronic anchor). Record candidate reference visit(s); if ambiguous, record candidates (ADR-002 D11).
2. **Problem list seed** from anchor: active problems, A&P, symptoms, med status, exam, studies.
3. **Back-pass**: iterate remaining retained passages in traceable batches; add problems first appearing earlier; update trajectories; track `reviewed_passage_ids` so completion = all retained passages accounted for.
4. **Tables**: medications (prescription/administration/advice/actual-use kinds), labs (value/unit/date/status/source), imaging (finding/status/source), vitals, discrepancies.
5. **Status per problem**: active/historical/resolved/uncertain/not_subsequently_addressed — absence ≠ resolution.
6. **Validate** all records (PM-022), then compose baseline.
7. Dates kept distinct: latest source date, latest encounter, latest comprehensive review, reference visit.

## Test cases (FakeProvider, deterministic)

- **T025-1** Completion requires `reviewed_passage_ids == retained_passage_ids`; a skipped batch → run fails.
- **T025-2** Later passage qualifies earlier interpretation → both passages retained as sources; earlier uncertainty preserved.
- **T025-3** Problem not mentioned after 2019 → status `not_subsequently_addressed`, not `resolved`.
- **T025-4** Order + specimen collection without result → lab table row `ordered`, result `not_found_in_available_chart`.
- **T025-5** Imaging fixture → imaging table row with verbatim finding and status.
- **T025-6** Restarted medication + older stop reason + result → linked by dates; no causal relation asserted unless explicitly documented.
- **T025-7** Duplicate procedure → single event.
- **T025-8** Baseline exposes four distinct dates (source/encounter/comprehensive/reference).

## Agent evals

- **AE025-1** `pytest -m eval -k route_b` on Charlie: rubric R1–R11 (thresholds in `EVALS.md`: R11 100 %, zero must-not hits, ≥ 9/10 R1–R10).
- **AE025-2** Report stage-by-stage token usage, latency, # validator rejections by rule.

## Human evals

- [ ] **HE025-1** Clinician reviews full Charlie baseline against Appendix A; signs off or files defects.
- [ ] **HE025-2** Reviewer confirms no runtime prompt embeds Charlie-specific diagnoses (v4 §5: examples must not become prompt content).
