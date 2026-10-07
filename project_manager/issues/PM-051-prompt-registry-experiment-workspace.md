<!-- gh-labels: type:build,area:backend,area:web,area:llm,agent:ready | gh-milestone: M5 Model & Experiment Workspace -->
# PM-051: Prompt registry + internal experiment workspace

| Field | Value |
|---|---|
| Type | Design-lite (screens in PR) + Build + Test |
| Milestone | M5 Model & Experiment Workspace |
| Depends on | PM-023, PM-050 |
| Blocks | PM-071 |
| v4 refs | §11 "Prompt workspace", "Saved stage diagnostics and fresh reruns", "A concrete prompt experiment" |

## Scope

1. **Prompt registry**: `PromptVersion` per stage (classification, evidence extraction, baseline synthesis, patient summary, follow-up + reason extraction, question generation/ranking, answer interpretation, scheduling, physician reporting) + shared instruction block (evidence rules + management-relevance principle). Edits create new versions; restore prior version; diff view. Move hardcoded prompts from `stages/**` into the registry (seed migration).
2. **Experiment runner**: pick patient + validated app-record versions (or snapshot) + stage + prompt version + provider config → fresh call → new run id (experiment flag) → validation → side-by-side comparison with a saved run. Experiments never publish to patient/physician views.
3. **Inspection UI** (internal, role-gated `internal`/admin): stage input, output, evidence links, validation errors, elapsed time, tokens, cost (provider-reported or labelled estimate), which stages ran fresh vs selected as validated inputs.
4. Thresholds (e.g. filter) editable per experiment.

## Test cases

- **T051-1** Editing prompt creates v(n+1); runs pinned to v(n) still show v(n) text.
- **T051-2** Experiment run never changes active published summary/report (assert before/after).
- **T051-3** Experiment on patient-summary stage with selected validated baseline makes exactly one fresh provider call; no upstream stage invoked.
- **T051-4** Changing filter threshold experiment forces fresh filter + downstream stages (dependency follows changed input).
- **T051-5** Non-internal user → 403 on workspace routes and UI hidden.
- **T051-6** Workspace never displays secrets (masked config only).
- **T051-7** Old outputs shown for comparison are labelled "saved output", not replayed into new run.

## Agent evals

- **AE051-1** Demo: change patient-summary prompt to improve reason wording; show diff of outputs and rubric checks still pass.

## Human evals

- [ ] **HE051-1** Developer can find why a summary sentence exists (trace to stage input) in < 2 minutes.
- [ ] **HE051-2** Reviewer confirms patient/physician screens expose no prompt mechanics.
