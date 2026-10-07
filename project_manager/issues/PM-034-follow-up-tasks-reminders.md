<!-- gh-labels: type:build,area:backend,area:web,area:llm,agent:ready | gh-milestone: M3 Summaries & Follow-ups -->
# PM-034: Clinician follow-up tasks & in-app reminders

| Field | Value |
|---|---|
| Type | Build + Test + Eval |
| Milestone | M3 Summaries & Follow-ups |
| Depends on | PM-025, PM-022; reminder frequency from ADR-002 D10/D12 |
| Blocks | PM-071 |
| v4 refs | §6 "Clinician recommended next steps and reminders", "A historical recommendation is not automatically a current task", §16 |

## Scope

1. Extraction stage: documented recommendations/orders → `FollowUpTask` with source refs, recorded timing (or none), stated reason (attributed) or `reason_not_recorded`; optional `hypothetical_reason` clearly flagged.
2. Status machine: `recommended_completion_unknown`, `historical_status_unknown`, `patient_reports_completed`, `patient_reports_plan_changed`, `superseded_by_newer_plan`, `result_available`. Patient completion report ≠ result.
3. Applicability: old orders default to `historical_status_unknown` (clarification item), not active reminders (ADR-002 D12).
4. In-app reminders only (no push/email/SMS); no reminders for superseded/completed tasks; no fabricated due dates.
5. Patient API + UI list beside summary: task, why (attributed or "reason not recorded"; hypothetical labelled), timing, status, source link; action "I did this / plan changed".

## Test cases

- **T034-1** Charlie Oct 2019 repeat B12 order → `historical_status_unknown`, no active reminder, no "overdue".
- **T034-2** Synthetic "Return appointment on 21 March to review results" → active reminder with date and attributed reason.
- **T034-3** Same synthetic note without reason → "reason not recorded".
- **T034-4** Hypothetical reason has `is_hypothetical=true` and UI label "possible reason (not stated in chart)".
- **T034-5** Patient marks completed → status `patient_reports_completed`, reminders stop, no result created.
- **T034-6** No code path sends outbound messages (grep test for smtp/twilio/push SDKs in reminders module).
- **T034-7** Task with no recorded timing shows no due date.

## Agent evals

- **AE034-1** Charlie extraction list with statuses; compare with v4 §16 "What appears beside the patient summary".

## Human evals

- [ ] **HE034-1** Clinician confirms no stale order is presented as currently due.
- [ ] **HE034-2** Hypothetical reasons are visibly distinct to a lay reviewer.
