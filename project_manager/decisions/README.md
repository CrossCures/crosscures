# Decisions (ADRs)

Decision (`type:decision`) and design (`type:design`) issues write their outcome here as `ADR-<issue>-<slug>.md`. Build issues must cite the ADR they implement. An ADR is **Accepted** only when the sign-off line is filled.

## Template

```markdown
# ADR-0xx: <title>

- Status: Proposed | Accepted | Superseded by ADR-0yy
- Issue: PM-0xx
- Date:
- Deciders: <product>, <clinical>, <tech>

## Context
What v4/spec says, what the current code does (file paths), why a decision is needed.

## Options
| Option | Pros | Cons | Code impact (files, tables, endpoints, screens) | Size |
|---|---|---|---|---|

## Decision
The chosen option, stated as testable rules.

## Consequences
- Issues created/updated:
- Tests that enforce this decision:
- Interim behavior for anything deferred:

## Sign-off
- Product: ____ date ____
- Clinical: ____ date ____
- Tech: ____ date ____
```

## Expected ADRs

| ADR | From issue | Topic |
|---|---|---|
| ADR-000 | PM-000 | Therapy alerts / suggested actions |
| ADR-001 | PM-001 | Mobile, wearables, extra flows scope |
| ADR-002 | PM-002 | v4 operational defaults |
| ADR-003 | PM-003 | Domain contracts & data model |
| ADR-012 | PM-012 | OCR engine |
| ADR-020 | PM-020 | Clinical text filter |
| ADR-030 | PM-030 | Physician report IA + source preview |
| ADR-041 | PM-041 | Adaptive question planner |
| ADR-060 | PM-060 | Physician feedback open questions |
