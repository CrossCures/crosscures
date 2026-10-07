<!-- gh-labels: type:build,area:backend,area:web,area:llm,agent:ready | gh-milestone: M3 Summaries & Follow-ups -->
# PM-033: Patient-friendly summary (composer + UI, versions)

| Field | Value |
|---|---|
| Type | Design-lite (copy guidelines in PR) + Build + Test + Eval |
| Milestone | M3 Summaries & Follow-ups |
| Depends on | PM-025, PM-022, PM-023 |
| Blocks | PM-071 |
| v4 refs | §6 "Patient friendly summary available at any time", §16 example paragraph |

## Scope

1. Composer `reports/patient_summary.py`: from the **same** validated baseline + patient reports as the physician report; outputs friendly lead paragraph (history, what was raised at reference visit, what clinician did/recommended, interval changes), reference visit date, interval covered, last update date. Patient reports attributed ("you reported"). Unclear comparison/outcome stated as unclear.
2. `PatientSummaryVersion` persisted; prior versions kept internally; "update in progress" indicator when a newer run is processing.
3. API `GET /v1/patient/summary` (latest validated) — never triggers a rerun; never requires completing a questionnaire.
4. Web patient page: summary first, then next steps area (PM-034 fills it), evidence detail on demand.
5. Validator re-check on summary claims (citation ids hidden from patient but stored).

## Test cases

- **T033-1** Summary and physician report built from same run share reference visit id and interval dates.
- **T033-2** Patient-report-derived sentence includes attribution marker in structured output (e.g. `attribution: patient_report`).
- **T033-3** Failed summary composition → last valid summary shown with date + pending label.
- **T033-4** `GET /v1/patient/summary` makes zero provider calls.
- **T033-5** Must-not list (EVALS R2, R5, R6, R8): summary does not claim healed finger, normalized liver tests, vitamin D 23, diabetes remission.
- **T033-6** Dana cannot read Charlie's summary.

## Agent evals

- **AE033-1** Real-model Charlie summary; readability score (Flesch-Kincaid grade ≤ 8 target) and rubric must-not checks.
- **AE033-2** Side-by-side with physician report: list any disagreements.

## Human evals

- [ ] **HE033-1** Clinician: summary is accurate and uncertainty preserved.
- [ ] **HE033-2** Lay reviewer: understands what happened and what's next without medical jargon.
