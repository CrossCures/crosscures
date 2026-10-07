<!-- gh-labels: type:build,area:backend,area:integration,agent:ready | gh-milestone: M1 Source-of-Truth Intake -->
# PM-013: Unify Fasten FHIR import with snapshot/passage pipeline

| Field | Value |
|---|---|
| Type | Build + Test |
| Milestone | M1 Source-of-Truth Intake |
| Depends on | PM-011 |
| Blocks | PM-014 |
| v4 refs | §3 (import and upload produce the same kind of preserved sources; truthful import states), `specs/fasten_integration.md` |

## Context

Fasten webhook (`api/fasten_webhook.py`, `ingestion/fasten_client.py`, `ingestion/service.py::ingest_fhir_json`) writes `HealthRecordDB` rows directly. v4 requires the same source/snapshot/passage path as uploads.

## Scope

1. Persist each downloaded EHI export (JSONL bundle) as a `SourceDocument` (original bytes + sha256) and include it in a snapshot.
2. FHIR parser producing passages with locator = `bundle sha + resource type + resource id + json pointer`; `DocumentReference` attachments (base64 PDFs/text) become child documents parsed by PM-011/PM-012 parsers.
3. Import states visible to patient: `connecting`, `connected`, `import_requested`, `import_complete`, `import_partial` (with missing/failed items), `import_failed`. Never claim records were imported that weren't.
4. Keep webhook idempotent (Fasten retries) via `EventDB.idempotency_key`.
5. Map existing `HealthRecordDB` usage per ADR-003 (dual-write or migrate).

## Test cases

- **T013-1** Fixture FHIR bundle → one SourceDocument + passages for Observation, MedicationRequest, Condition with resolvable locators.
- **T013-2** DocumentReference with base64 PDF → child document parsed into passages.
- **T013-3** Same webhook delivered twice → no duplicate documents or snapshots.
- **T013-4** Export with one failed resource download → state `import_partial` listing the failure.
- **T013-5** MedicationRequest stored as evidence kind input "prescription", never "actual use" (assert passage metadata).
- **T013-6** Webhook for an unknown/unauthorized patient mapping is rejected and logged without PHI.
- **T013-7** Missing Fasten credentials → truthful `not_configured` state, no crash.

## Agent evals

- **AE013-1** Run against Fasten sandbox if credentials available; otherwise state "live Fasten unverified" explicitly in report.

## Human evals

- [ ] **HE013-1** Reviewer completes sandbox connect + import (if credentials exist) and sees accurate states.
