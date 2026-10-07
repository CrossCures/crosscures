<!-- gh-labels: type:build,area:backend,area:data,agent:ready | gh-milestone: M1 Source-of-Truth Intake -->
# PM-010: Preserve original documents, content hashes, chart snapshots

| Field | Value |
|---|---|
| Type | Build + Test |
| Milestone | M1 Source-of-Truth Intake |
| Depends on | PM-003, PM-004 |
| Blocks | PM-011, PM-014 |
| v4 refs | §2 step 1, §3 "Preserving the chart", §8 (snapshots vs app versions), §12 |

## Context

Today `POST /v1/patient/records/upload` (`api/patient.py`) decodes bytes and writes `HealthRecordDB` rows; original bytes, hashes, and snapshots do not exist.

## Scope

1. Blob storage abstraction `crosscures_v2/sources/storage.py` (local filesystem dir configured via settings; interface allows S3/Replit object storage later). Store original bytes immutable, keyed by sha256.
2. Tables/models per ADR-003: `SourceDocument`, `ChartSnapshot`, `SnapshotDocument` (+ Alembic migration).
3. Upload endpoint (new or revised, e.g. `POST /v1/patient/documents`) accepts 1..n files: PDF, DOCX, TXT, JPEG/PNG/HEIC; rejects unsupported/corrupt/password-protected files with per-file reason; accepted files persisted **before** any processing.
4. Snapshot rule: a new snapshot is created only when the set of document hashes for the patient changes. Duplicate identical upload is recognized (import history kept, no new snapshot).
5. `GET /v1/patient/documents` and `GET /v1/patient/snapshots/{id}` returning accepted files, state (`accepted`/`rejected`/`processing`/`processed`/`failed`), reason.
6. Size limits configurable (initial default documented; final limits decided in PM-012/PM-011).
7. Emit event `SOURCE_DOCUMENT_ACCEPTED` via `events/bus.py` with idempotency key = sha256+patient.

## Out of scope

Parsing/passages (PM-011), OCR (PM-012), Fasten (PM-013), UI (PM-014).

## Test cases

- **T010-1** Upload `chart2.docx` → stored bytes sha256 equals input sha256; document belongs to Charlie only.
- **T010-2** Upload same file twice → one `SourceDocument` content, two receipt records, one snapshot.
- **T010-3** Upload a changed version (`edge/changed_chart` v2) → new snapshot; previous snapshot unchanged and retrievable.
- **T010-4** Mixed batch (valid PDF + `edge/unreadable.pdf` + `.exe`) → valid accepted, others rejected with distinct reasons; valid one persists.
- **T010-5** Dana's token cannot list/read Charlie's documents (403/404).
- **T010-6** Simulated crash after storing bytes but before snapshot commit → retry produces exactly one snapshot (idempotency).
- **T010-7** No original bytes are ever modified: storage write-once test (second write with same key does not change content).

## Agent evals

- **AE010-1** Report storage layout and how it maps to Replit deployment.
- **AE010-2** Confirm existing `HealthRecordDB` upload path still works or is deprecated per ADR-003 (state which).

## Human evals

- [ ] **HE010-1** Reviewer uploads 3 files incl. one bad file in Swagger UI; reasons are understandable to a patient.
- [ ] **HE010-2** Reviewer verifies no file contents are logged.
