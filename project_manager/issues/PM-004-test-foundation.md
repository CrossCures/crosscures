<!-- gh-labels: type:build,area:backend,area:web,area:testing,agent:ready | gh-milestone: M0 Foundations & Decisions -->
# PM-004: Test foundation — Alembic, pytest/vitest, synthetic fixtures, test clock

| Field | Value |
|---|---|
| Type | Build + Test |
| Milestone | M0 Foundations & Decisions |
| Depends on | – (human prerequisite: add `chart2.docx` synthetic chart to fixtures) |
| Blocks | Every build issue |
| v4 refs | §15 (synthetic fixtures, controllable test clock) |

## Context

There are **no automated tests** in the repo today. `alembic` is in `requirements.txt` but unused; `database.py` calls `Base.metadata.create_all`. The Charlie chart (`chart2.docx`) and gold standard are not in the repo.

## Scope

1. **Backend test harness** in `artifacts/crosscures-api/tests/`: `conftest.py` with temp SQLite DB per test, FastAPI `TestClient`, auth helpers (patient + physician tokens, physician–patient link), `requirements-dev.txt` (pytest, pytest-asyncio, freezegun or equivalent).
2. **Alembic**: `alembic.ini`, `migrations/`, baseline revision matching current `db_models.py`; `database.py` stops calling `create_all` in non-test environments (startup runs `alembic upgrade head` or documented command). Keep Replit start script working (`artifacts/crosscures-api/start.sh`).
3. **Test clock**: `crosscures_v2/clock.py` with `now()` used by new code; overridable in tests and via an env flag in a demo environment only (never in production config).
4. **FakeProvider** test double (see `EVALS.md`) under `tests/fakes/` — scripted JSON responses; not importable from `crosscures_v2`.
5. **Fixtures** listed in `EVALS.md` (`charlie/`, `dana/`, `edge/*`). Agent creates all synthetic edge fixtures and `dana/`; human drops in `charlie/chart2.docx`. Add `charlie/expected_facts.yaml` encoding rubric R1–R11.
6. **Web**: vitest + @testing-library/react in `artifacts/crosscures` with one smoke test; `test` script in package.json.
7. **CI**: GitHub Actions workflow running `pytest -q`, `pnpm run typecheck`, web `test`.
8. **Pytest markers**: `eval` (needs provider key, skipped otherwise), `slow`.

## Out of scope

Changing app behavior; fixing existing bugs (PM-005).

## Test cases

- **T004-1** `pytest -q` runs ≥ 1 integration test hitting `GET` health/root route and one authenticated patient route.
- **T004-2** `alembic upgrade head` then `alembic downgrade base` on empty SQLite succeeds; schema after upgrade equals `Base.metadata` (autogenerate produces no diff).
- **T004-3** Test clock: freezing at `2022-03-18T10:00:00-04:00` is observed by `clock.now()`.
- **T004-4** `FakeProvider` cannot be imported from any module under `crosscures_v2/` (test greps imports).
- **T004-5** Fixture loader returns Charlie and Dana with distinct patient IDs and overlapping dates.
- **T004-6** `pytest -m eval` is skipped (not failed) when no provider key is set.
- **T004-7** Web `pnpm -C artifacts/crosscures run test` passes.
- **T004-8** CI workflow green on the PR.

## Agent evals

- **AE004-1** Report test runtime (target < 60 s for unit+integration).
- **AE004-2** List each fixture with a one-line description and which rubric/edge case it supports.
- **AE004-3** Confirm Replit startup still works (document command run and output).

## Human evals

- [ ] **HE004-1** `chart2.docx` added by a human and confirmed synthetic.
- [ ] **HE004-2** Reviewer confirms `expected_facts.yaml` matches `EVALS.md` rubric incl. the two Appendix A corrections.
- [ ] **HE004-3** Synthetic edge fixtures contain no real names/identifiers.
