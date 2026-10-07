<!-- gh-labels: type:build,area:backend,area:web,agent:ready | gh-milestone: M7 Hardening & Acceptance -->
# PM-072: Integration slots — vision, watch, visit recording (unavailable states)

| Field | Value |
|---|---|
| Type | Build + Test |
| Milestone | M7 Hardening & Acceptance |
| Depends on | PM-001 (ADR-001 Q2), PM-003 |
| Blocks | PM-071 ("Future slots" row) |
| v4 refs | §1 "Integration spaces", §8 "Optional recording", §10 "Future observation inputs", §13 |

## Scope

1. `ObservationInput` contract (ADR-003): patient_id, source (device/module), measurement interval + tz, value + unit, quality/missingness, permission status, provenance.
2. Slots registered with status `unavailable` by default: `vision_module`, `apple_watch`, `visit_recording`. Patient/physician UI shows a clear "not connected" state; no simulated values.
3. Existing wearable code handled per ADR-001 Q2 (e.g. mounted only behind flag and mapped to `ObservationInput`).
4. Ingest endpoint validates contract but rejects data while slot disabled.
5. Brief/summary composers ignore observations unless slot enabled and validated.

## Test cases

- **T072-1** Slot disabled → ingest returns 409/403; nothing stored.
- **T072-2** Contract validation: missing unit/interval/source → 422.
- **T072-3** UI shows "Not connected" for each slot; no numeric placeholders.
- **T072-4** Seed/demo scripts (`seed.py`, `seed_demo.py`) don't create wearable observations presented as real (or mark them `synthetic_demo` and UI labels them).
- **T072-5** Visit recording cannot start automatically on appointment time (no scheduler hook exists).

## Agent evals

- **AE072-1** Screenshot of patient + physician views with slots unavailable.

## Human evals

- [ ] **HE072-1** Product confirms slot wording; no implied capability.
