<!-- gh-labels: type:design,area:llm,area:backend,agent:draft-then-approve | gh-milestone: M4 Patient Interaction -->
# PM-041: Design adaptive question planner (4 categories, answer states)

| Field | Value |
|---|---|
| Type | Design (agent drafts → clinician + tech lead approve) |
| Milestone | M4 Patient Interaction |
| Depends on | PM-003, ADR-002 (D4, D10) |
| Blocks | PM-042 |
| v4 refs | §7 (whole), §2 steps 5–6, §16 conversation examples |

## Context

Current `stages/pre_visit/question_generator.py` uses fixed domains (pain, fatigue, sleep, mood) + condition templates + a pain follow-up. `previsit_call` and `health_report` are separate LLM conversations (fate per ADR-001 Q5).

## Design deliverables (`decisions/ADR-041-question-planner.md`)

1. **Selection principle** prompt block: information that could change the physician's understanding or management; rationale recorded; no management decisions.
2. **Categories**: chart_completion, future_symptom, current_trajectory, med_tolerability; one answer can satisfy several.
3. **Pre-ask search**: before asking, search baseline + prior answers; don't re-ask stable facts; re-ask changing facts with dated reference.
4. **Ranking + grouping**: score, dedupe overlapping candidates, burden limits (ADR-002 D10).
5. **Answer states**: answered, skipped, unknown ("I don't know"), not_yet_asked, no_symptom_reported; repeated-skip policy.
6. **Question schema**: id, category, text, response options (incl. free text), rationale, linked problem/med/task ids, evidence refs, phrasing neutrality rules (no implied diagnosis/expected symptom).
7. **Answer interpretation schema**: map one patient report → updates to multiple records; uncertainty preserved (e.g. "less swelling but still tender").
8. **Plan versioning**: new plan supersedes unfinished future sessions (ADR-002 D4).
9. Migration of existing check-in UI/data.

## Test cases (implemented in PM-042)

- **T041-1** Drainage procedure documented → no question asking whether drainage happened.
- **T041-2** "Less swelling but still tender" → trajectory `improving_partial`, not `resolved`; patient words retained.
- **T041-3** Stomach upset with unknown onset relative to antibiotic → recorded with timing uncertainty; no causal link asserted; at most one neutral clarification.
- **T041-4** "I don't know" → state `unknown`, not negative.
- **T041-5** Answer covering symptom + stopped tablet → stored once, linked to both symptom and medication.
- **T041-6** Future-symptom question text contains no "expected"/"likely to" phrasing (lint).

## Agent evals

- **AE041-1** Simulated conversation transcripts (3) for Charlie with planner rationale per question.

## Human evals

- [ ] **HE041-1** Clinician approves categories, neutrality rules, and Charlie transcripts.
- [ ] **HE041-2** Product approves burden limits.
