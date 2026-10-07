<!-- gh-labels: type:build,area:backend,area:llm,agent:ready | gh-milestone: M3 Summaries & Follow-ups -->
# PM-031: Physician report composer (versioned, from validated baseline)

| Field | Value |
|---|---|
| Type | Build + Test + Eval |
| Milestone | M3 Summaries & Follow-ups |
| Depends on | PM-025, PM-030 (approved), PM-022 |
| Blocks | PM-032, PM-061 |
| v4 refs | §6, §9, §12 |

## Scope

1. `crosscures_v2/reports/physician.py`: compose `PhysicianReportVersion` from validated baseline + validated patient reports + appointment context per ADR-030 payload. Model writes prose only over validated records; every statement carries citation ids that the validator re-checks (V1/V2) before publish.
2. Stable ids for section/subproblem/statement/citation within a version.
3. Versioning: new version on new snapshot/answers/regeneration; earlier versions immutable and retrievable; `newer_version_id` link.
4. API: `GET /v1/physician/patients/{pid}/reports` (list versions), `GET /v1/physician/reports/{report_version_id}`; `GET /v1/physician/sources/{citation_id}` → original passage + context (or patient report). Physician–patient link enforced.
5. Replace current brief generation path (`stages/pre_visit/brief_generator.py`) per ADR-003 migration plan; keep old briefs readable.
6. "For physician review" items contain information gaps only (per ADR-000); no treatment suggestions.

## Test cases

- **T031-1** Report statements all have ≥ 1 citation resolving inside the same patient + snapshot/patient-report set.
- **T031-2** Model output statement with unknown citation id → statement rejected; report not published if a required section is empty → stays draft.
- **T031-3** Generating v2 does not modify v1 content; v1 has `newer_version_id`.
- **T031-4** Unlinked physician → 403 on report and source endpoints.
- **T031-5** Header fields present: report date, coverage dates, latest patient interaction, reference visit.
- **T031-6** Orders and results are returned in separate typed lists.
- **T031-7** Text scan: no imperative treatment verbs in "for review" items (lint list: start, stop, increase, decrease, prescribe…).

## Agent evals

- **AE031-1** Charlie report via real model: rubric R1–R11; attach rendered JSON.
- **AE031-2** Count of statements, citations per statement, rejections.

## Human evals

- [ ] **HE031-1** Clinician reads Charlie report: accuracy, uncertainty language, and no app-authored management.
- [ ] **HE031-2** Clinician confirms report agrees with patient summary (PM-033) on reference visit and interval changes.
