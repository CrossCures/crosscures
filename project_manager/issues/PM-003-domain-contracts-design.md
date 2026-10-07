<!-- gh-labels: type:design,area:backend,area:data,agent:draft-then-approve | gh-milestone: M0 Foundations & Decisions -->
# PM-003: Design shared domain contracts & data model

| Field | Value |
|---|---|
| Type | Design (agent drafts → human approves) → Build (schemas + migration skeleton) |
| Milestone | M0 Foundations & Decisions |
| Depends on | PM-002 (for appointment/report lifecycle fields) |
| Blocks | PM-010, PM-022, PM-023, PM-030, PM-041, PM-050, PM-072 |
| v4 refs | §2 "What the workflow must preserve", §3, §8 (versions vs snapshots), §10, §11, §12 |

## Goal

Agree the typed contracts every later component uses, so parallel agents do not invent incompatible shapes. v4 §10: "Agree on these contracts before parallel implementation."

## Scope

Draft Pydantic v2 models (API/stage boundaries) and SQLAlchemy tables (persistence) for:

| Entity | Key fields / invariants |
|---|---|
| `SourceDocument` | id, patient_id, original bytes ref, sha256, mime, source_type (upload/fasten), received_at, readable chart number, tags |
| `ChartSnapshot` | id, patient_id, ordered set of document hashes, created_at; **new snapshot only when content set changes** |
| `SourcePassage` | id, document_id, snapshot_id, locator (pdf page+span / docx paragraph / txt line range / fhir resource path / image bbox), text, ocr_confidence?, dates {document, encounter, report, ambiguity} |
| `PassageDisposition` | passage_id, run_id, disposition (retained/excluded/ambiguous/duplicate_of), reason, classifier version |
| `EvidenceRecord` | id, run_id, kind (observation/result/order/prescription/administration/recommendation/patient_report/education), value/unit verbatim, dates, status (preliminary/final/…), source refs[], validation status |
| `Problem`, `MedicationRecord`, `LabResult`, `ImagingResult`, `Discrepancy` | each references EvidenceRecords; status ∈ active/historical/resolved/uncertain/not_subsequently_addressed |
| `AnalysisRun` / `StageArtifact` | run_id, patient_id, snapshot_id, patient_report_versions[], route, filter version, stage, input hash, prompt version, model config, schema version, implementation version, status, diagnostics |
| `PatientReport` (answer) | id, patient_id, question_id, session_id, modality, original text, corrections[], described timing vs report timestamp |
| `Question`, `QuestionPlanVersion`, `CheckInSession` | category (chart_completion/future_symptom/current_trajectory/med_tolerability), rationale, state (not_asked/answered/skipped/unknown/no_symptom_reported) |
| `FollowUpTask` | source recommendation refs, recorded timing?, status (recommended_completion_unknown/patient_reports_completed/superseded/…), stated reason vs hypothetical reason flag |
| `Appointment` | datetime + tz, status (scheduled/rescheduled/cancelled/unknown), cutoff_at |
| `PhysicianReportVersion`, `PatientSummaryVersion` | id, version, run_id, snapshot_id, included patient report versions, reference visit, coverage dates, status (draft/published/superseded/failed) |
| `ProviderConfig`, `PromptVersion` | per-stage provider/model, prompt text hash, created_by |

Also define: ID strategy (UUIDs + human-readable chart numbers), patient-scope invariant (every row carries `patient_id`; FK checks), and which existing tables are kept, migrated, or retired (`health_records`, `symptom_logs`, `physician_briefs`, `memory_records`, …).

## Out of scope

Implementing pipelines or endpoints; UI.

## Deliverables

1. `project_manager/decisions/ADR-003-domain-contracts.md` — ER diagram (mermaid), entity table, invariants, migration plan from current tables.
2. `crosscures_v2/domain/` package with Pydantic models only (no behavior) + `__init__` exports.
3. Empty Alembic revision stubs are **not** created here (each build issue owns its migration).

## Test cases

- **T003-1** Every domain model round-trips JSON (`model_validate(model_dump())`) for a sample built from Charlie fixture data.
- **T003-2** Every model that represents patient data has a required `patient_id`.
- **T003-3** Enum values match v4 vocabulary (test asserts exact sets for evidence kinds, problem statuses, answer states, task statuses).
- **T003-4** `EvidenceRecord` rejects `kind="result"` without a value or explicit `value_absent_reason`.
- **T003-5** `PatientReport` keeps `original_text` immutable (corrections appended, not overwritten).

## Agent evals

- **AE003-1** Traceability table: each v4 §15 acceptance row → entities/fields that make it checkable. No row unmapped.
- **AE003-2** Mapping table: current `db_models.py` tables → keep/migrate/retire with reason.

## Human evals

- [ ] **HE003-1** Tech lead approves ADR-003 (blocking for all build issues listed above).
- [ ] **HE003-2** Clinician confirms enum vocabularies (evidence kinds, statuses, answer states) match clinical meaning.
- [ ] **HE003-3** No entity allows a patient report to overwrite a chart fact.
