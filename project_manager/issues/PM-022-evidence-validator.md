<!-- gh-labels: type:design,type:build,area:backend,area:clinical-safety,agent:ready | gh-milestone: M2 Filtering & Reconstruction -->
# PM-022: Evidence model & deterministic evidence validator

| Field | Value |
|---|---|
| Type | Design (rules doc in PR) + Build + Test |
| Milestone | M2 Filtering & Reconstruction |
| Depends on | PM-003, PM-011 |
| Blocks | PM-024, PM-025, PM-031, PM-033 |
| v4 refs | §2 step 3, §5 "Medication and diagnostic distinctions", §12 "Isolation", "structured outputs must be checked" |

## Context

`agent/validator.py` only checks safety. Nothing verifies model-extracted facts against sources. v4: "Building the final baseline from validated evidence records is a software responsibility, not just a prompt instruction."

## Scope

`crosscures_v2/evidence/validator.py` — pure, deterministic functions over `EvidenceRecord` candidates + snapshot passages:

| Rule | Check |
|---|---|
| V1 Scope | patient_id, snapshot_id, source passage ids all belong to the run's input set |
| V2 Resolvable | every source ref resolves via PM-011 resolver |
| V3 Value fidelity | numeric value + unit appear verbatim (normalized whitespace) in a cited passage; missing unit ⇒ `unit_not_specified`, not inferred |
| V4 Kind fidelity | `result` must cite a result-type passage (not an order); `actual_use` cannot be supported only by prescription/education passages |
| V5 Status | `final` vs `preliminary` must match source wording when present |
| V6 Dates | evidence date must appear in or be derivable from cited passage; never the upload date |
| V7 Patient report attribution | `patient_report` evidence must cite a `PatientReport`, not a chart passage, and vice versa |
| V8 Duplicate events | same procedure from two notes merged into one event with multiple sources (helper + check) |

Output: `ValidationResult` (accepted records, rejected records with rule + reason). Rejected records kept as restricted diagnostics.

## Test cases

- **T022-1** B12 139 pg/mL citing 24 Jul 2019 note → accepted; same claim with 193 → rejected V3.
- **T022-2** A1C 5.9 with unit "%" when source prints none → rejected V3 (unit must be `unit_not_specified`).
- **T022-3** `result` citing the Oct 2019 B12 **order** passage → rejected V4.
- **T022-4** finasteride `actual_use` citing monograph → rejected V4.
- **T022-5** Evidence citing Dana's passage in Charlie's run → rejected V1.
- **T022-6** Unknown passage id → rejected V2.
- **T022-7** Culture "2+ mixed skin flora" accepted; "MRSA" as result rejected (only suspicion in source).
- **T022-8** Vitamin D "23" anywhere → rejected (no supporting passage).
- **T022-9** AST/ALT "20/19" → rejected.
- **T022-10** Two I&D procedure notes 22 Feb 2022 → one event, two sources (V8).
- **T022-11** Property test: random perturbation of a numeric value in an accepted record always causes rejection.

## Agent evals

- **AE022-1** Rules doc in PR mapping each rule to v4 sentences.
- **AE022-2** Coverage report: validator module ≥ 95 % line coverage.

## Human evals

- [ ] **HE022-1** Clinician reviews rule table for clinical correctness (esp. V4/V5).
- [ ] **HE022-2** Reviewer confirms rejected records are never displayed to patient/physician.
