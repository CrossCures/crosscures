<!-- gh-labels: type:build,area:backend,area:web,area:llm,agent:ready | gh-milestone: M4 Patient Interaction -->
# PM-042: Question planner + save-before-interpret answer pipeline

| Field | Value |
|---|---|
| Type | Build + Test + Eval |
| Milestone | M4 Patient Interaction |
| Depends on | PM-041 (approved), PM-023, PM-025 |
| Blocks | PM-043, PM-044, PM-071 |
| v4 refs | §2 step 5, §7, §8 "Maintain a longitudinal app record", §12 "Failures preserve work" |

## Scope

1. `planning/planner.py`: generate ranked questions per ADR-041 from validated baseline + answer history; persist `QuestionPlanVersion` with rationale.
2. Conversation API (`/v1/patient/conversations/...`): start session, get next question, submit answer (text/voice transcript/quick choice), skip, "don't know", pause/resume.
3. **Save-before-interpret**: answer persisted as `PatientReport` (original text, modality, timestamps, session, question) in the same request; interpretation runs as a run stage afterwards.
4. Interpretation failure → answer saved, status "processing pending", retry from saved answer; patient never asked to repeat.
5. On successful interpretation: new app record versions, refreshed summaries + plan via PM-023 publication gate.
6. Idempotent submit (client turn id) to prevent duplicates on retry/reconnect.
7. Update web check-in/conversation page; retire or adapt `question_generator.py` per ADR-001/041.

## Test cases

- **T042-1..6** Implement T041-1..T041-6 (FakeProvider).
- **T042-7** Interpretation provider error → `PatientReport` exists; UI state "Your answer is saved; summary update is still processing"; retry succeeds without re-entry.
- **T042-8** Same turn id submitted twice → one PatientReport.
- **T042-9** New answer settles uncertainty → question not asked again in different words (planner input contains closure).
- **T042-10** New answer never creates a treatment instruction (output schema has no such field; lint for imperatives).
- **T042-11** Dana's session cannot submit to Charlie's question ids.

## Agent evals

- **AE042-1** Real-model scripted patient simulation (Charlie, 3 sessions per v4 §16) — report repeated-question rate (target 0 for stable facts), categories covered, neutrality lint hits.

## Human evals

- [ ] **HE042-1** Clinician reviews simulated transcripts: relevance, neutrality, no re-asking.
- [ ] **HE042-2** Lay reviewer completes a session by text on 390 px screen.
