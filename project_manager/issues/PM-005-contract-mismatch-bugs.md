<!-- gh-labels: type:bug,area:web,area:mobile,area:backend,agent:ready | gh-milestone: M0 Foundations & Decisions -->
# PM-005: Fix frontend/backend contract mismatches (check-in, mobile brief/alert)

| Field | Value |
|---|---|
| Type | Bug fix (Build + Test) |
| Milestone | M0 Foundations & Decisions |
| Depends on | PM-004; mobile part also PM-001 Q1 (skip mobile if frozen/removed) |
| Blocks | – |
| v4 refs | §10 (typed boundaries) |

## Context

- Backend `stages/pre_visit/question_generator.py` emits questions with `question_id`, `text`, `response_type`.
- Web `artifacts/crosscures/src/pages/patient/checkin.tsx` reads `q.id`, `q.type`.
- Mobile `artifacts/crosscures-mobile/app/(patient)/(tabs)/checkin.tsx` reads `id`, `prompt`, `type`.
- Mobile `app/(physician)/brief/[id].tsx` expects `summary`, `key_points`; mobile `alert/[id].tsx` expects `title`, `message`, `read`; backend `api/physician.py` returns `sections`, `citations`, `severity`, `acknowledged_at`.

## Scope

1. Pick the backend shape as source of truth; define TypeScript types for these payloads in one place (prefer the generated client in `lib/api-client-react` / `lib/api-spec/openapi.yaml` if it reflects the FastAPI app; otherwise a shared `types.ts` per app) and update screens.
2. Add contract tests so drift fails CI.
3. Do not change product behavior beyond rendering the existing data correctly. (Alert screens: only fix if PM-000 keeps them; otherwise leave for the PM-000 follow-up.)

## Test cases

- **T005-1** Backend contract test: `GET` check-in questions response validates against a JSON schema exported to `tests/contract/checkin_questions.schema.json`.
- **T005-2** Web vitest: check-in page renders question text and correct input type from a fixture matching the schema.
- **T005-3** Web vitest: submitting answers posts `question_id` keys the backend accepts (integration test in pytest posts same payload → 200).
- **T005-4** Mobile `typecheck` passes with the shared types (if mobile in scope).
- **T005-5** Mobile brief screen renders `sections` and citation markers from a fixture (if mobile in scope).

## Agent evals

- **AE005-1** Manually run web app against local backend with seed data; screenshot of check-in page showing questions (attach).
- **AE005-2** List any other mismatches found while fixing (file follow-ups, do not fix out of scope).

## Human evals

- [ ] **HE005-1** Reviewer completes a check-in end to end on web; answers appear in physician patient detail.
- [ ] **HE005-2** No visual regressions on check-in page at 390 px width.
