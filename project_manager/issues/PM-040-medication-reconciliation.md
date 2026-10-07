<!-- gh-labels: type:build,area:backend,area:web,agent:ready | gh-milestone: M4 Patient Interaction -->
# PM-040: Medication reconciliation (backend + UI)

| Field | Value |
|---|---|
| Type | Build + Test |
| Milestone | M4 Patient Interaction |
| Depends on | PM-025 (medication table), PM-042 (patient report storage; can stub with PatientReport model from PM-003) |
| Blocks | PM-071 |
| v4 refs | §7 "Medication reconciliation comes first when relevant", §5 medication distinctions, §16 first conversation |

## Context

Today: `pages/patient/medications.tsx` + prescription create/confirm endpoints; adherence questions in `question_generator.py`. No reconciliation of chart-listed vs actual use.

## Scope

1. API: `GET /v1/patient/medications/reconciliation` → chart-listed items (from validated medication table) with evidence kind + date + source; `POST` responses per item: `taking`, `not_taking`, `unsure`, `taking_differently` (+ free text), and add new med/supplement.
2. Each response saved as a dated `PatientReport` linked to the medication record; chart record unchanged.
3. Display rules: one-time administration (e.g. B12 injection) not shown as daily med awaiting checkbox; education-only drugs not listed; uncertain items never default-confirmed.
4. Dose/timing asked only when needed (flag from planner).
5. Physician report med section shows chart vs reported side by side (consumed by PM-031).
6. Voice/text path supported via conversation (PM-042) using the same storage.

## Test cases

- **T040-1** Charlie: clindamycin appears as "prescribed 22 Feb 2022"; finasteride/minoxidil absent.
- **T040-2** B12 injection shown as past administration, not a checkbox item.
- **T040-3** Patient selects `not_taking` → PatientReport stored; chart MedicationRecord unchanged; no "nonadherence" label created.
- **T040-4** "I take B12 sometimes, don't know strength" → stored verbatim; dose remains unknown (no 2019 dose substituted).
- **T040-5** Default state for every item is unanswered (not `taking`).
- **T040-6** Re-answer creates a new version; history retained.
- **T040-7** UI: keyboard and 390 px layout; axe 0 serious.

## Agent evals

- **AE040-1** Screenshots of Charlie reconciliation screen; list of items with evidence kind.

## Human evals

- [ ] **HE040-1** Clinician confirms item list and labels are clinically correct for Charlie.
- [ ] **HE040-2** Lay reviewer completes reconciliation in < 2 minutes.
