<!-- gh-labels: type:design,area:llm,area:backend,agent:draft-then-approve | gh-milestone: M2 Filtering & Reconstruction -->
# PM-020: Design clinical text filter + labeled eval set

| Field | Value |
|---|---|
| Type | Design (agent drafts → clinician approves labels) + Eval set |
| Milestone | M2 Filtering & Reconstruction |
| Depends on | PM-011 |
| Blocks | PM-021 |
| v4 refs | §4 "Shared clinical text filtering", §16 (21 Oct 2019 hair-loss note + monographs), Appendix A7 |

## Goal

Specify a section-level classifier that keeps clinically useful text and excludes admin/generic education, and build the labeled set used to measure it. **Low recall on clinical text is the main risk**: losing a clinician plan is worse than keeping a handout.

## Deliverables

1. `decisions/ADR-020-clinical-filter.md`:
   - Label taxonomy: `clinical_note`, `assessment_plan`, `telephone_encounter`, `result`, `imaging_report`, `procedure`, `medication_history`, `individualized_instruction`, `education_generic`, `drug_monograph`, `administrative`, `duplicate`, `uncertain`.
   - Retain/exclude mapping (uncertain ⇒ retain or review; never exclude on score alone).
   - Segmentation rule: classify **sections/spans**, not whole documents or titles.
   - Duplicate handling: link to earlier occurrence; keep if new date/treatment/result.
   - Output JSON schema (per passage: label, retain bool, reason, confidence, duplicate_of?).
   - Model choice: low-cost structured-output model via provider adapter (PM-050), with deterministic pre-rules (e.g. scheduling boilerplate) allowed.
   - Failure policy: malformed output or unreconciled section map ⇒ run paused; **never** fall back to unfiltered chart.
2. `tests/fixtures/filter_labels/charlie.jsonl` + `edge.jsonl`: human-verified labels per passage.
3. Prompt draft v1 for the filter stage (stored per PM-051 format once available; plain file until then).

## Test cases (implemented in PM-021, defined here)

- **T020-1** Charlie 21 Oct 2019 note: alopecia assessment, thyroid orders, dermatology referral → retained; finasteride/minoxidil monograph spans → `drug_monograph` excluded.
- **T020-2** 24 Jul 2019 patient instructions with D2 50,000 units weekly × 12 weeks → `individualized_instruction` retained despite title.
- **T020-3** Telephone encounters with clinical content retained.
- **T020-4** Copied history repeated across notes → `duplicate` linked, not new events.

## Agent evals

- **AE020-1** Inter-annotator check: agent pre-labels; report agreement vs clinician labels.
- **AE020-2** Baseline metrics with prompt v1 on labeled set: clinical-text **recall ≥ 0.98** (target), exclusion precision reported, token reduction %.

## Human evals

- [ ] **HE020-1** Clinician verifies every label in `charlie.jsonl` marked `retain=true/false` for A&P, instructions, results.
- [ ] **HE020-2** Tech lead approves schema and failure policy.
