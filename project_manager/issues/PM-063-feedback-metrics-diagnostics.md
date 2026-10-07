<!-- gh-labels: type:build,area:backend,area:web,area:feedback,agent:ready | gh-milestone: M6 Physician Feedback -->
# PM-063: Feedback metrics & diagnostics trace view

| Field | Value |
|---|---|
| Type | Build + Test |
| Milestone | M6 Physician Feedback |
| Depends on | PM-061 (PM-051 for trace UI reuse) |
| Blocks | PM-071 |
| Spec | `specs/physician_feedback_v2.md` "The three metrics", "Summary table", "Where it hangs" |

## Scope

1. Section exposure logging per ADR-060 F6 (client sends rendered/expanded section ids per review episode; deduped).
2. Metric queries (internal role only):
   - Accuracy: distinct (episode, version, section) with ≥ 1 active flag / eligible displayed sections; show numerator, denominator, exposure definition, participation.
   - Completeness: Yes / answered; eligible, answered, nonresponse shown separately.
   - Utility: distribution among answered; eligible + nonresponse separate. **No averaging, no composite score.**
3. Filters: date range, report release/prompt version, route, physician (aggregated), patient (internal only).
4. Diagnostics trace: from a flag → report version → run → stages → prompt/model config → validator diagnostics → source passages (link to PM-051 inspection).
5. CSV export without secrets or free-text PHI unless role allows.

## Test cases

- **T063-1** 3 citation flags in one section → numerator +1.
- **T063-2** Withdrawn flag not counted; corrected flag counted once.
- **T063-3** Collapsed-only section not in denominator.
- **T063-4** Unanswered completeness excluded from denominator and shown as nonresponse.
- **T063-5** Utility endpoint returns counts per category; no mean/score field.
- **T063-6** Cancelled appointment episodes excluded from completed-encounter metrics.
- **T063-7** Trace endpoint for a flag returns run id, route, prompt version ids, validator results.
- **T063-8** Non-internal role → 403.

## Agent evals

- **AE063-1** Seed synthetic feedback (≥ 20 episodes) and attach metrics output; hand-verify one number per metric.

## Human evals

- [ ] **HE063-1** Product lead confirms metric definitions match spec and ADR-060.
- [ ] **HE063-2** Engineer traces one flag to its likely failing stage in < 5 minutes.
