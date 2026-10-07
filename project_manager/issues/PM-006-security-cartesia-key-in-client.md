<!-- gh-labels: type:bug,security,area:web,area:backend,agent:ready | gh-milestone: M0 Foundations & Decisions -->
# PM-006: Security — Cartesia API key is bundled into the web client

| Field | Value |
|---|---|
| Type | Bug fix (security) — Build + Test |
| Milestone | M0 Foundations & Decisions |
| Priority | **P0** — do first |
| Depends on | – |
| Blocks | PM-044 |
| v4 refs | §11 "Keys… must never appear in… browser responses"; OWASP A02/A05 (sensitive data exposure, misconfiguration) |

## Context

`artifacts/crosscures/src/lib/cartesia.ts` reads `import.meta.env.VITE_CARTESIA_API_KEY` and sends it as `X-API-Key` from the browser. Any `VITE_*` variable is inlined into the public JS bundle, so the key is readable by anyone who loads the app. The backend already has a proxy: `POST /v1/voice/synthesize` in `crosscures_v2/api/voice.py`.

## Scope

1. Remove all `VITE_CARTESIA_*` secret usage from the web app; call the backend `/v1/voice/synthesize` (authenticated) instead. Non-secret settings (voice id, model) may stay client-side or move to backend config.
2. Ensure backend proxy requires auth, rate-limits per user (simple in-memory limiter is fine), and never returns or logs the key.
3. Remove the key from any `.env` committed for the web app; document backend env var only.
4. **Human action:** rotate the Cartesia key (it must be assumed exposed).

## Test cases

- **T006-1** CI step: build web app and assert `dist/` contains no string matching the Cartesia key pattern or `VITE_CARTESIA_API_KEY`.
- **T006-2** `POST /v1/voice/synthesize` without auth → 401.
- **T006-3** Backend logs during a synth request contain no key (caplog assertion).
- **T006-4** Web TTS still plays via backend (vitest with mocked fetch asserts URL is backend route, no `X-API-Key` header).

## Agent evals

- **AE006-1** `grep -rn "VITE_.*KEY\|X-API-Key" artifacts/crosscures/src` returns nothing after fix; list any other `VITE_*` secrets found (file follow-ups).

## Human evals

- [ ] **HE006-1** Cartesia key rotated; old key revoked.
- [ ] **HE006-2** Reviewer checks deployed bundle in browser devtools: no key present.
