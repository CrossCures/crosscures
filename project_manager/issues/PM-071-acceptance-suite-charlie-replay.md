<!-- gh-labels: type:test,area:testing,area:web,area:backend,agent:ready | gh-milestone: M7 Hardening & Acceptance -->
# PM-071: v4 §15 acceptance suite + Charlie replay with test clock

| Field | Value |
|---|---|
| Type | Test (E2E) + Demo |
| Milestone | M7 Hardening & Acceptance |
| Depends on | M1–M6 build issues (incrementally runnable; mark rows pending until their feature lands) |
| Blocks | V1 sign-off |
| v4 refs | §15 (all rows), §16 (Charlie replay) |

## Scope

1. Playwright E2E project `artifacts/crosscures/e2e/` against backend with seeded synthetic patients, FakeProvider (deterministic mode) **and** real-provider mode (`--real`, nightly).
2. One spec file per v4 §15 row (table below). Each asserts the observable outcome via UI + API.
3. **Charlie replay** script driven by test clock: 28 Feb 2022 upload → first conversation (answers from v4 §16) → 7 Mar, 14 Mar check-ins → 18 Mar 10:00 cutoff → physician report review → feedback submission. Output: screenshots + JSON timeline in `e2e/results/charlie_replay/`.
4. Report labels live vs simulated behavior separately (Fasten, providers, RunPod, voice).

| Row | Spec file |
|---|---|
| Record entry | `record-entry.spec.ts` |
| Complete coverage | `coverage.spec.ts` |
| Both analysis routes | `routes.spec.ts` |
| Patient and physician summaries | `summaries.spec.ts` |
| Clinician follow-up reminders | `followups.spec.ts` |
| Separate app documents | `app-documents.spec.ts` |
| Optional visit recording (absent) | `no-recording.spec.ts` |
| Source accuracy | `source-accuracy.spec.ts` |
| Clinical distinctions | `clinical-distinctions.spec.ts` |
| Isolation | `isolation.spec.ts` |
| Changed chart | `changed-chart.spec.ts` |
| Prompt experiments | `experiments.spec.ts` |
| Conversation | `conversation.spec.ts` |
| Voice and interruption | `voice.spec.ts` (text-fallback path automated; mic path manual) |
| Answer-driven timing | `timing.spec.ts` |
| Appointment cutoff | `cutoff.spec.ts` |
| Recoverable errors | `recoverable-errors.spec.ts` |
| Product boundary | `product-boundary.spec.ts` |
| Future slots and portability | `slots-portability.spec.ts` (390 px viewport) |
| Physician feedback (spec table) | `feedback.spec.ts` |

## Test cases

- **T071-1..20** One per row above; each must pass in deterministic mode in CI.
- **T071-21** Charlie replay completes; timeline matches v4 §16 table (dates, sources, statuses).
- **T071-22** Product boundary: crawl all screens; none contain "alert", "urgent", "severity", outbound-message UI.

## Agent evals

- **AE071-1** Acceptance matrix (row → pass/fail/pending → link to evidence) attached.
- **AE071-2** Real-provider nightly results with rubric scores (PM-026) linked.

## Human evals

- [ ] **HE071-1** Clinician + product walk through Charlie replay demo and sign V1 acceptance.
- [ ] **HE071-2** Manual voice test on desktop + iPhone browser recorded.
