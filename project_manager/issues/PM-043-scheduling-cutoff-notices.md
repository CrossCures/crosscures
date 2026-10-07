<!-- gh-labels: type:build,area:backend,area:web,agent:ready | gh-milestone: M4 Patient Interaction -->
# PM-043: Model-proposed scheduling, appointment cutoff, in-app notices

| Field | Value |
|---|---|
| Type | Build + Test |
| Milestone | M4 Patient Interaction |
| Depends on | PM-002 (decided values), PM-042, PM-004 (test clock) |
| Blocks | PM-071 |
| v4 refs | §2 steps 6–7, §7 "Scheduling decisions", §9 |

## Context

`AppointmentDB` exists; `schedule_previsit` accepts any datetime; the 72 h cutoff exists only in docstrings/prompts.

## Scope

1. Appointment model per ADR-003: date/time + IANA tz, status (scheduled/rescheduled/cancelled/unknown), computed `cutoff_at` per ADR-002 D1. Simple web form to enter/update.
2. Planner output includes proposed next check-in time + topics + rationale; scheduler validates: future, before cutoff, within burden policy; invalid → validation error, no session created.
3. One current next check-in; superseded sessions kept in history (ADR-002 D4).
4. At cutoff: stop launching scheduled AI questions for the cycle; trigger physician report + patient summary readiness; physician sees "report ready" in-app.
5. Behavior for active conversation at cutoff, post-cutoff voluntary reports, reschedule, cancel, unknown appointment — exactly per ADR-002 D5–D9.
6. In-app notices only: questions ready, check-in due, clinician follow-up reminder, report ready. No clinical judgments in notices.
7. All time logic uses `clock.now()`.

## Test cases

- **T043-1..5** Implement T002-1..T002-5.
- **T043-6** Proposed check-in after cutoff → rejected; no session.
- **T043-7** Missing rationale → rejected.
- **T043-8** New plan supersedes uncompleted future sessions; completed sessions untouched.
- **T043-9** After cutoff, patient summary + follow-up reminders still accessible; scheduled questions not offered.
- **T043-10** Report generation failure at cutoff → physician sees "update unavailable/pending" + last valid version date; no "delivered" state.
- **T043-11** Notice text contains no urgency/clinical terms (lint list).
- **T043-12** Unknown appointment → UI shows "cutoff cannot be scheduled yet".

## Agent evals

- **AE043-1** Charlie replay with test clock 28 Feb → 18 Mar 2022: log of sessions and cutoff events.

## Human evals

- [ ] **HE043-1** Product reviewer verifies each ADR-002 decision is implemented as written.
