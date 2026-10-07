<!-- gh-labels: type:decision,conflict,agent:prep-only,area:mobile,area:backend | gh-milestone: M0 Foundations & Decisions -->
# PM-001: Decide scope of native mobile, wearables router, and extra conversation flows (v4 conflict)

| Field | Value |
|---|---|
| Type | Decision |
| Milestone | M0 Foundations & Decisions |
| Depends on | – |
| Blocks | PM-005 (mobile part), PM-044, PM-072 |
| v4 refs | §1 (web now, iPhone later), §13 (camera/watch = integration spaces only), §14 (portability), §8 (optional visit recording) |
| Agent role | **Prep only** |

## Context

The current app contains work that v4 places later or does not describe:

1. **Native Expo app** (`artifacts/crosscures-mobile`) with patient + physician tabs. v4: "Both patient and physician experiences can run in a web app… We are not building the native iPhone app in this version." Several mobile screens already mismatch backend payloads (see PM-005).
2. **Wearables**: HealthKit/Health Connect sync (`crosscures-mobile/lib/wearable/*`), backend `api/wearables.py` (router **not mounted** in `app.py`), tables `wearable_samples`, `workout_samples`, `sleep_segments`; brief has a `wearable_highlights` section. v4 §13: watch data is a future integration space; "No simulated reading should appear as a real patient measurement."
3. **Extra conversational stages**: `stages/clinic` (in-visit assistant with "Maria" wake word), `stages/previsit_call`, `stages/health_report`. v4 treats in-visit assistance as future/decision, and wants one adaptive check-in conversation model.

## Questions to decide

| # | Question | Options |
|---|---|---|
| Q1 | Mobile app during V1 | (a) freeze: no new features, keep compiling; (b) maintain parity; (c) remove from workspace build |
| Q2 | Wearables | (a) keep as integration slot (PM-072) behind flag, mount router only when enabled; (b) mount now; (c) remove |
| Q3 | Brief `wearable_highlights` section | keep only if real data exists and is attributed; else hide |
| Q4 | `clinic` in-visit assistant | (a) freeze behind flag; (b) remove; (c) keep |
| Q5 | `previsit_call` and `health_report` flows | (a) fold into the v4 adaptive conversation (PM-042) and retire; (b) keep separately |

## Deliverables

- `project_manager/decisions/ADR-001-scope.md` with decisions Q1–Q5 and the list of follow-up issues to create (e.g. "retire health_report flow after PM-042").
- Update `README.md` issue index if new issues are created.

## Test cases (for follow-up build issues)

- **T001-1** If mobile frozen: `pnpm -C artifacts/crosscures-mobile run typecheck` still passes in CI.
- **T001-2** Feature-flagged routes return 404 when the flag is off (integration test per flagged router).
- **T001-3** Brief composer omits wearable section when no attributed wearable observations exist.

## Agent evals

- **AE001-1** Produce an inventory table: feature → files → tables → endpoints → screens → v4 status.
- **AE001-2** Identify any data currently shown to users that could be mistaken for a real measurement (seeded/demo wearable data in `seed.py`, `seed_demo.py`).

## Human evals

- [ ] **HE001-1** Product lead signs off Q1–Q5 in the ADR.
- [ ] **HE001-2** Follow-up issues are filed and linked.
