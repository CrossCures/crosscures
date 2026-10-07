<!-- gh-labels: type:build,area:backend,area:llm,agent:ready | gh-milestone: M2 Filtering & Reconstruction -->
# PM-023: Analysis run orchestration, stage artifacts, publication gate

| Field | Value |
|---|---|
| Type | Build + Test |
| Milestone | M2 Filtering & Reconstruction |
| Depends on | PM-003, PM-050 |
| Blocks | PM-021, PM-024, PM-025, PM-042, PM-051, PM-070 |
| v4 refs | §2 step 4 (coordinated publication), §8 (stale outputs), §11 (pinned inputs, no caching), §12 (failures preserve work) |

## Scope

1. `crosscures_v2/runs/`: `AnalysisRun` lifecycle (`created → filtering → reconstructing → composing → validating → published | failed | paused`), new run ID per attempt.
2. `StageArtifact` persistence: inputs hash, outputs, validation diagnostics, prompt version, model config, schema + implementation version, timings, token usage (link to `AuditEntryDB`).
3. Background execution (simple in-process worker/queue acceptable; document choice) with resume from last saved stage after restart; no duplicate runs for same trigger (idempotency key).
4. **Publication gate**:
   - Initial publication per ADR-002 D3 (all-or-nothing for baseline + summaries + plan).
   - At publish time re-check that the run's snapshot + patient-report versions are still current; if newer inputs exist, mark `superseded_before_publish` (debug only).
   - Failed run never replaces last published versions; last valid stays visible with date + "update pending/failed".
5. Route selection field (`A`/`B`) with ADR-002 D2 default; route cannot be invoked without a completed filter result for the same run.
6. No response caching: assert every stage in a new run makes a fresh provider call (unless the stage's input is an explicitly selected validated app record, per v4 §11).

## Test cases

- **T023-1** Happy path with FakeProvider: run reaches `published`; all artifacts linked to run, patient, snapshot.
- **T023-2** Failure at composing stage on first run → nothing published; patient sees processing explanation state.
- **T023-3** Failure on later run → previous published versions remain active and dated; status "update failed".
- **T023-4** New snapshot arrives mid-run → older run cannot publish over newer state.
- **T023-5** Restart after filtering stage → resume from saved artifact without re-running filter; run ID unchanged.
- **T023-6** Two identical triggers → one run.
- **T023-7** Route invoked without filter result → error, no provider call.
- **T023-8** Two consecutive runs on same inputs → FakeProvider called twice per stage (no cache).
- **T023-9** Artifacts of Charlie's run not retrievable via Dana's context.

## Agent evals

- **AE023-1** State diagram (mermaid) in PR matching implementation.
- **AE023-2** Kill-the-process manual test log demonstrating resume.

## Human evals

- [ ] **HE023-1** Reviewer confirms no path publishes partial clinical output (code read of publish function).
- [ ] **HE023-2** Reviewer confirms prompt/model/schema versions recorded for each artifact.
