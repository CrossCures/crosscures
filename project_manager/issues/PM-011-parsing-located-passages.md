<!-- gh-labels: type:build,area:backend,area:data,agent:ready | gh-milestone: M1 Source-of-Truth Intake -->
# PM-011: Parse PDF/DOCX/TXT into located source passages + coverage manifest

| Field | Value |
|---|---|
| Type | Design-lite (locator format) + Build + Test |
| Milestone | M1 Source-of-Truth Intake |
| Depends on | PM-010 |
| Blocks | PM-012, PM-013, PM-020, PM-022 |
| v4 refs | §2 step 2, §3 "Preserving the chart", "Complete processing ≠ complete history" |

## Context

Today non-JSON uploads are decoded as UTF-8 or a stringified byte prefix (`ingestion/service.py`). There are no passage locators, so citations cannot open original text. `PyMuPDF` is already a dependency.

## Scope

1. `crosscures_v2/sources/parsers/` with one parser per type: text PDF (PyMuPDF page + char span), DOCX (python-docx paragraph/table cell index), TXT (line range). Image-only PDF pages are detected and marked `needs_ocr` (handled in PM-012).
2. Segment into passages (note/section boundaries where detectable: headings, note titles, dates); each passage stores locator, text, and extracted dates `{document_date, encounter_date, report_date, ambiguity}` — never default to upload date.
3. **Coverage manifest** per document: every page/paragraph/line accounted for as `passage`, `blank`, `needs_ocr`, or `parse_error`. A document with an unaccounted region is `failed`, not silently partial.
4. Resolver `resolve(locator) → original text + surrounding context` used later by source preview.
5. Processing is idempotent per (document sha256, parser version).

## Test cases

- **T011-1** `chart2.docx`: every paragraph appears in exactly one passage or is marked blank; manifest coverage = 100 %.
- **T011-2** Charlie note "22 February 2022 ED provider note 110364510" is a passage whose encounter_date = 2022-02-22.
- **T011-3** Resolver round-trip: for 50 random passages, `resolve(locator).text == passage.text`.
- **T011-4** Text PDF fixture: locator page numbers and spans resolve correctly.
- **T011-5** TXT fixture: line ranges resolve correctly.
- **T011-6** Image-only PDF page → `needs_ocr`; document state not `processed`.
- **T011-7** Exact values preserved: passage containing "B12 139 pg/mL" retains that string byte-for-byte.
- **T011-8** Date ambiguity: passage with two candidate dates records ambiguity rather than picking one.
- **T011-9** Re-running parser on same doc/version creates no duplicates.

## Agent evals

- **AE011-1** Report per-fixture: #passages, coverage %, #needs_ocr, #parse_error.
- **AE011-2** Spot-check 10 Charlie passages: date fields vs source; report mismatches.

## Human evals

- [ ] **HE011-1** Reviewer opens 5 passages via resolver and confirms they match the original document visually.
- [ ] **HE011-2** Reviewer confirms passage segmentation does not merge two different notes.
