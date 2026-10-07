<!-- gh-labels: type:decision,conflict,agent:prep-only,area:backend,area:web,area:mobile | gh-milestone: M0 Foundations & Decisions -->
# PM-000: Decide fate of therapy alerts, severity & suggested actions (v4 conflict)

| Field | Value |
|---|---|
| Type | Decision (Discuss → Decide → follow-up build issue) |
| Milestone | M0 Foundations & Decisions |
| Depends on | – |
| Blocks | PM-030, PM-031, PM-032 (physician surfaces), PM-071 |
| v4 refs | §1 (alerts out of scope), §9 (routine notices only), §12 (no escalation), Appendix B (removed doctor/treatment-failure alerts) |
| Agent role | **Prep only**: draft the options analysis; do not change code |

## Context

The live app has a therapy outcome detector that v4 explicitly excludes:

- `artifacts/crosscures-api/crosscures_v2/stages/therapy/detector.py` computes `overall_status`, `deviation_severity` (mild/moderate/severe), `red_flag_detected`, `side_effects`, `suggested_actions`, and creates `PhysicianAlertDB` rows; severe alerts set `requires_acknowledgment`.
- `PhysicianAlertDB` / `PhysicianBriefDB` have `delivery_status` / `delivered_at` fields (no sender exists).
- Physician alert screens: web `pages/physician/alerts*.tsx`, `alert-detail.tsx`; mobile `app/(physician)/alert/[id].tsx`.
- The brief's `suggested_discussion_points` section may read as app-authored management advice.

v4: "Autonomous medication-risk scores, early-warning predictions, clinical alerts, and escalation are outside this version." Routine notices may say *report ready*, *questions ready*, *check-in due*, *clinician follow-up reminder* — never clinical warnings or urgency labels.

## Options to evaluate

| Option | Description |
|---|---|
| A. Remove | Delete detector, alert endpoints, UI, and tables (with migration); keep audit history export |
| B. Feature-flag off | Keep code behind a disabled flag, hide UI, block routes; revisit post-V1 |
| C. Repurpose | Convert detector output into *information gaps* (e.g. "pain reports since day 14 — no change documented") feeding the question planner and physician "for review" items, with no severity, no red flag, no alert table |
| D. Keep (reject v4) | Requires explicit product sign-off and v4 amendment |

Also decide: rename/remove `suggested_discussion_points` → v4 "items for physician review" (information gaps only, no treatment suggestions).

## Deliverables

- `project_manager/decisions/ADR-000-therapy-alerts.md` with: options, code inventory (files/tables/endpoints/screens touched), data migration impact, clinical/safety rationale, decision, owner, date.
- Follow-up build issue(s) filed from the template with test cases (e.g. "PM-000a: Remove/flag therapy alerts").

## Test cases (for the follow-up build issue; copy into it)

- **T000-1** No route returns objects with `severity`, `red_flag_detected`, `urgency`, or `suggested_actions` fields (contract test over OpenAPI schema).
- **T000-2** Submitting check-ins that previously produced a severe alert creates no `PhysicianAlertDB` row and no notification.
- **T000-3** Physician web and mobile navigation contains no "Alerts" entry (vitest/RTL snapshot of nav).
- **T000-4** If option C: detector output is stored only as information-gap records with source links; no severity field exists.
- **T000-5** Migration downgrade/upgrade preserves existing audit entries.

## Agent evals

- **AE000-1** Code inventory is complete: `grep -rn "alert\|severity\|red_flag\|suggested_actions" artifacts/` results all accounted for in the ADR.
- **AE000-2** For each option, list concrete files changed and rough size (S/M/L).

## Human evals

- [ ] **HE000-1** Product lead and clinical lead agree on one option; recorded in ADR with date.
- [ ] **HE000-2** Clinical lead confirms the replacement wording for brief "discussion points" contains no treatment advice.
- [ ] **HE000-3** Decision communicated; dependent design issues (PM-030) updated.
