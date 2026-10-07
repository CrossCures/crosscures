<!-- gh-labels: type:build,area:backend,area:feedback,agent:ready | gh-milestone: M6 Physician Feedback -->
# PM-061: Physician feedback backend (records, revisions, idempotency)

| Field | Value |
|---|---|
| Type | Build + Test |
| Milestone | M6 Physician Feedback |
| Depends on | PM-060, PM-031 |
| Blocks | PM-062, PM-063 |
| Spec | `specs/physician_feedback_v2.md` "Proposed data model", "Failure handling", "Acceptance checks" |

## Scope

1. `crosscures_v2/feedback/`: `FeedbackRecord` + `FeedbackRevision` tables (migration) with fields from the spec: id, report_version_id, review_episode_id, appointment ref/status, physician_id (from auth, never client), patient_id, metric (`accuracy`/`completeness`/`utility`), section/statement/citation ids, response, free_text, capture_phase, created_at, revision state (active/corrected/withdrawn), submission token.
2. `ReviewEpisode` (physician × patient × appointment × report version) per ADR-060.
3. Endpoints: `POST /v1/physician/feedback` (idempotent by submission token), `PATCH .../{id}` (correct/withdraw → new revision; history kept), `GET /v1/physician/reports/{rv}/feedback`.
4. Validation: report version belongs to patient; physician linked to patient; section/statement/citation ids exist **in that report version**; completeness/utility only in end-of-visit phase per ADR-060; appointment cancelled/unknown → not counted as completed encounter.
5. Event `BRIEF_FEEDBACK_SUBMITTED` (`source=physician`) emitted only after commit; retries don't duplicate.
6. Feedback free text treated as data (never fed to models as instructions); feedback never edits reports, creates alerts, or triggers retraining.

## Test cases

- **T061-1** Accuracy flag on a valid section of rv1 → 201; stored with rv1 even after rv2 exists.
- **T061-2** Citation id from rv2 submitted against rv1 → 422.
- **T061-3** Section id from Dana's report submitted with Charlie's report → 422/403.
- **T061-4** Client-supplied `physician_id` ignored; auth identity used.
- **T061-5** Same submission token twice → one record, one event.
- **T061-6** DB failure mid-save → 5xx, no event, earlier feedback intact.
- **T061-7** Withdraw flag → revision recorded; original retrievable in history; current state withdrawn.
- **T061-8** Completeness skipped → no record (or explicit `unanswered`), never "No".
- **T061-9** Feedback submission does not change report content or create alerts/notifications.

## Agent evals

- **AE061-1** OpenAPI snippet for new endpoints in PR; contract tests added.

## Human evals

- [ ] **HE061-1** Reviewer checks spec acceptance rows "Old report still open", "Isolation", "Save failure", "Product boundary" are covered by tests.
