# Evals and Test Framework

Every issue lists three kinds of checks:

1. **Test cases** — automated, deterministic, run in CI. IDs look like `T<issue>-<n>` (e.g. `T010-3`).
2. **Agent evals** — checks the agent runs and reports in the PR, including LLM-quality evals that are not deterministic. IDs `AE<issue>-<n>`.
3. **Human evals** — reviewer checklist completed before merge. IDs `HE<issue>-<n>`.

## Test layers

| Layer | Tooling | Where | Rules |
|---|---|---|---|
| Unit | pytest / vitest | `artifacts/crosscures-api/tests/unit`, `artifacts/crosscures/src/**/*.test.tsx` | No network, no real provider; use `FakeProvider` (PM-004/PM-050) |
| Integration (API) | pytest + FastAPI `TestClient` + temp SQLite | `tests/integration` | Exercise real routers, auth, DB, migrations |
| Contract | pytest + generated JSON schema / zod | `tests/contract` | Backend response shape == frontend expected type |
| Golden fixture | pytest | `tests/golden` | Deterministic pipeline parts against synthetic fixtures (parsing, filtering dispositions with fake provider, validator) |
| LLM eval | pytest `-m eval` | `tests/evals` | Real provider; skipped without key; writes JSON report to `tests/evals/results/` |
| E2E | Playwright (PM-071) | `artifacts/crosscures/e2e` | Uses seeded synthetic patients + test clock |

**Test-only fake provider:** `FakeProvider` returns scripted responses keyed by test name. It exists only in tests. It is *not* a response cache and must never be importable from production code paths.

## Synthetic fixtures (created in PM-004)

| Fixture | Contents | Used for |
|---|---|---|
| `charlie/` | `chart2.docx` (human-supplied synthetic chart), expected-facts rubric from v4 Appendix A | Reconstruction, summaries, Charlie replay |
| `dana/` | Second synthetic patient with overlapping dates and similar text | Isolation |
| `edge/handout_beside_note` | Clinician plan + drug monograph in one note | Filtering |
| `edge/ambiguous_med_date` | Medication with unclear effective date | Med reconciliation, questions |
| `edge/result_without_report` | Note mentions a result, primary report absent | Evidence validation |
| `edge/order_without_result` | Order + specimen collection, no result | Order/result distinction |
| `edge/changed_chart` | Same document v1 and v2 | Snapshots, stale-output protection |
| `edge/cross_patient_ref` | Model output citing Dana's source in Charlie's run | Isolation |
| `edge/imaging_report` | Synthetic imaging report + note mentioning it | Imaging table (Appendix A says chart2 lacks imaging) |
| `edge/scanned.pdf`, `edge/photo_label.jpg` | Image-only content, one low-confidence handwritten dose | OCR |
| `edge/unreadable.pdf` | Corrupt / password-protected | Truthful failure |

## Clinical-fidelity rubric (Charlie, from v4 Appendix A)

Use for PM-024/025/026/031/033 evals. Score each item **pass / fail / not-applicable**. The gold-standard document is a style reference, **not** a fact oracle.

| ID | Must be true in output | Must NOT appear |
|---|---|---|
| R1 | Source coverage stated as 28 May 2012 – 26 Feb 2022; 22 Feb 2022 acute visit, 26 Feb culture, and 28 Oct 2019 broad review all represented | Whole chart described as current |
| R2 | A1c trajectory: 6.3 (16 Jun 2018, unit not printed), 8.0 % of total Hgb (17 Jul 2019), 5.9 (21 Oct 2019, unit not printed); current status unknown | "Diabetes in remission" or "currently controlled/uncontrolled" |
| R3 | Lipids exact: 17 Jul 2019 TC 212, LDL 141 (calc), HDL 35, TG 218 mg/dL; 21 Oct 2019 LDL 139 (calc), HDL 35, TC 204 | Invented later triglycerides; inferred statin use |
| R4 | B12 139 pg/mL (17 Jul 2019) as result; injection administration; supplement advice; Oct 2019 repeat B12 order — as four distinct evidence kinds | "B12 deficiency corrected"; confirmed ongoing supplement use from chart alone |
| R5 | Vitamin D 6 ng/mL (17 Jul 2019); D2 50,000 units weekly × 12 weeks from patient instructions retained | **Vitamin D 23 in Oct 2019** (unsupported by chart) |
| R6 | AST/ALT 51/72 (16 Jun 2018, no units printed); clinician impression "likely fatty liver"; hepatitis workup ordered, results not found | **AST/ALT normalized ~20/19** (unsupported); "negative hepatitis workup" |
| R7 | Alopecia assessment, thyroid orders, dermatology referral retained | Finasteride/minoxidil listed as patient medications |
| R8 | Finger paronychia I&D 22 Feb 2022 as ONE event with two sources; clindamycin 300 mg PO QID × 7 days prescribed; MRSA suspected; culture 2+ mixed skin flora | "MRSA confirmed"; "infection resolved" (not documented) |
| R9 | CPAP history and snoring as patient-reported history; 9 Jun 2018 rectal bleeding history and 16 Jun exam as separate events | Current sleep apnea diagnosis or confirmed resolution |
| R10 | Vitals exact: 9 Jun 2018 86.6 kg (191 lb) BP 117/81; 21 Oct 2019 83 kg (183 lb) BP 122/97; differing heights left attributable | Harmonized single height; vaccine "administered" from discussion |
| R11 | Every displayed claim has ≥1 resolvable citation to Charlie's snapshot | Any citation to another patient or snapshot |

**Thresholds (initial, revisit after first baseline):** R11 = 100 %; zero "Must NOT appear" hits; ≥ 9/10 of R1–R10 pass for Route B; Route A reported for comparison.

## Agent eval report format (paste in PR)

```markdown
### Agent eval report — PM-xxx
- Commit: <sha>
- Commands run: `pytest -q` (N passed), `pnpm run typecheck` (ok), `pytest -m eval -k <...>` (provider/model: ..., prompt versions: ...)
| Eval ID | Result | Evidence (numbers, file, screenshot) |
|---|---|---|
| AE0xx-1 | pass | 42/42 passages located, report: tests/evals/results/xxx.json |
- Guardrails touched: <list> and how preserved
- Known gaps / follow-ups filed: #...
```

## Human eval conventions

- Clinical-content human evals (fidelity, wording, patient tone) need a **clinician reviewer**; mark the HE item with the reviewer's initials.
- UX human evals are done on desktop Chrome **and** an iPhone-width viewport (390 px) with keyboard-only navigation for at least one pass.
- A human eval "fail" blocks merge unless the reviewer files a follow-up and explicitly accepts the gap in the PR.
