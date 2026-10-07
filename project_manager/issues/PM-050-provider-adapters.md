<!-- gh-labels: type:build,area:backend,area:llm,security,agent:ready | gh-milestone: M5 Model & Experiment Workspace -->
# PM-050: Provider adapter layer, per-stage model config, secret hygiene

| Field | Value |
|---|---|
| Type | Build + Test |
| Milestone | M5 Model & Experiment Workspace (needed early by M2) |
| Depends on | PM-003 |
| Blocks | PM-023, PM-051 |
| v4 refs | §11 "Provider settings", §10 "Provider adapters", §12 |

## Context

`agent/llm.py::call_llm` is Anthropic-only (`claude-sonnet-4-6`) and used by every stage; secrets are env vars in `config.py`.

## Scope

1. `crosscures_v2/providers/`: `Provider` protocol → `complete(request: StageRequest) -> StageResponse | ProviderError`, with JSON-schema structured output, usage, latency, and context-limit metadata.
2. Adapters: Anthropic (existing), Gemini (low-cost classification), RunPod endpoint (authenticated, configurable schema; **verify** auth, request/response schema, context, structured output before enabling — mark `unverified` otherwise), and test-only `FakeProvider` hook.
3. Per-stage config: default provider/model + per-stage overrides (DB-backed `ProviderConfig`, versioned); stage records exact config used.
4. Secrets: loaded from env/secret store on backend only; settings endpoint returns masked status (`configured`/`missing`/`connection_ok`/`error`) — never key material. Redaction filter on logging and audit previews (`AuditEntryDB.prompt_preview`).
5. Untrusted-data rule: adapter request type separates `instructions` from `data` fields; chart/answer text only in `data`.
6. Migrate existing `call_llm` callers to adapter without behavior change.

## Test cases

- **T050-1** Stage with override uses overridden provider/model; others use default (FakeProvider registry).
- **T050-2** Missing key → `ProviderError(not_configured)`; run shows truthful state; no crash.
- **T050-3** Masked settings endpoint never returns key characters (assert response JSON lacks key substring).
- **T050-4** Logging redaction: logger call containing key → redacted in caplog.
- **T050-5** Schema-invalid model output → `ProviderError(invalid_output)`; raw output stored only as restricted diagnostic.
- **T050-6** Request builder places chart text only inside `data` (snapshot of rendered request).
- **T050-7** RunPod adapter with unverified flag cannot be selected for patient-facing runs.

## Agent evals

- **AE050-1** Smoke call per configured real provider (`pytest -m eval -k providers`): latency, structured output OK; providers without credentials reported "unverified".

## Human evals

- [ ] **HE050-1** Reviewer confirms secrets never leave backend (code read of settings + audit paths).
- [ ] **HE050-2** Decide secret store for hosted deployment (Replit secrets vs other) — v4 mentions Windows Credential Manager for local Windows prototype; confirm what applies.
