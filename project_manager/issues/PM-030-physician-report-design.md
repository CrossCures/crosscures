<!-- gh-labels: type:design,area:web,area:ux,agent:draft-then-approve | gh-milestone: M3 Summaries & Follow-ups -->
# PM-030: Design physician report v2 IA + source preview interaction

| Field | Value |
|---|---|
| Type | Design (agent drafts wireframes + component spec → clinician & tech lead approve) |
| Milestone | M3 Summaries & Follow-ups |
| Depends on | PM-003, PM-000 (what replaces "discussion points"/alerts) |
| Blocks | PM-031, PM-032, PM-062 |
| v4 refs | §6 "Physician summary", §9, §14; user addition: hover to open original note, temp window; `physician_feedback_v2.md` "Report surface and source inspection" |

## Context

Current `pages/physician/brief-detail.tsx` renders 6 LLM sections (`patient_snapshot`, `symptom_trends`, `wearable_highlights`, `medication_adherence`, `patient_concerns`, `suggested_discussion_points`) with `[S#]` hover citations to labels, not original passages.

## Design deliverables (`decisions/ADR-030-physician-report.md`)

1. **Information architecture**
   - Header: patient, report date, chart coverage dates, latest included patient interaction date, named reference visit, version + "newer version exists" banner.
   - **Opening brief**: what changed since reference visit; unresolved items worth reviewing; old findings date-labelled.
   - **Problem detail** (expand per problem): latest known state → earlier course → documented clinician plan → interval patient reports → "for physician review" items (information gaps only).
   - **Medication reconciliation**: chart-listed vs patient-reported actual use.
   - **Results**: lab + imaging tables (exact values, units, date, status; orders visually distinct from results).
   - **Timeline**: desktop matrix (visits × problems); narrow screens: per-problem chronological view.
2. **Stable addressable IDs** for section, subproblem, statement, citation (needed by feedback PM-061).
3. **Source preview interaction spec**
   - Desktop hover on statement/tag opens a temporary window with original passage highlighted + surrounding context, doc name + date; stays open while pointer moves into it and while scrolling; closes when pointer leaves the region.
   - Keyboard: focus opens, stays while focus inside, Esc closes. Click/tap opens the same view with explicit close. Narrow screens: full-height sheet.
   - Multiple sources: list all; tabs or stacked.
   - Scans: original image beside OCR text.
   - Patient-report claims open the dated saved answer + correction history.
   - Failure: show error; never substitute another source.
4. Component list + API payload shape for PM-031.
5. Wireframes (Figma link or PNG/ASCII in ADR) for desktop 1280 and mobile 390.

## Test cases (to be implemented in PM-032; define here)

- **T030-1** Pointer enters preview from statement without closing it.
- **T030-2** Scroll inside preview keeps it open.
- **T030-3** Pointer leaves both statement and preview → closes after delay.
- **T030-4** Keyboard focus + Esc behavior.
- **T030-5** Tap opens sheet with close button at 390 px.

## Agent evals

- **AE030-1** Traceability: each v4 §6/§9 physician-view requirement → IA element.

## Human evals

- [ ] **HE030-1** Clinician walkthrough of wireframes with Charlie example: can find interval changes in < 30 s; can reach source for any claim.
- [ ] **HE030-2** Accessibility reviewer approves interaction spec.
