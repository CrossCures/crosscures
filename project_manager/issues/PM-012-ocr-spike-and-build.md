<!-- gh-labels: type:design,type:build,area:backend,area:data,agent:draft-then-approve | gh-milestone: M1 Source-of-Truth Intake -->
# PM-012: OCR for scanned PDFs and images (spike → build)

| Field | Value |
|---|---|
| Type | Spike/Design (agent drafts, human approves engine) → Build → Test |
| Milestone | M1 Source-of-Truth Intake |
| Depends on | PM-011 |
| Blocks | PM-014 (image upload states), PM-071 |
| v4 refs | §3 (scanned PDFs need OCR; low confidence visible; never guess a handwritten dose) |

## Phase 1 — Spike (deliverable: `decisions/ADR-012-ocr.md`)

Compare ≥ 2 options on the OCR fixtures: e.g. Tesseract (local), a cloud OCR API, a vision-capable LLM via provider adapter. Criteria: per-word confidence availability, bounding boxes, handwriting behavior, PHI/data-handling, cost, Replit deployability, latency. **Human approves engine before Phase 2.**

## Phase 2 — Build

1. OCR stage for `needs_ocr` pages and image uploads; passages store image locator (page + bbox) and `ocr_confidence`.
2. Low-confidence spans flagged `uncertain_text`; never "corrected" from expected regimens.
3. Original image always retained and retrievable for side-by-side preview.
4. Document state `processed_with_warnings` when low-confidence spans exist; `failed` when page unreadable.

## Test cases

- **T012-1** `edge/scanned.pdf`: all pages OCR'd; coverage manifest 100 %; passages have bbox locators.
- **T012-2** `edge/photo_label.jpg` handwritten dose: span flagged `uncertain_text`; no numeric dose appears in any evidence derived from it.
- **T012-3** Unreadable page → document `failed`, other accepted documents unaffected.
- **T012-4** OCR provider error → document `failed` with retry path; bytes retained; retry succeeds with FakeProvider.
- **T012-5** Resolver for image passage returns original image crop reference and OCR text.

## Agent evals

- **AE012-1** Spike table with measured character error rate per option on fixtures.
- **AE012-2** Post-build: OCR CER on `edge/scanned.pdf` ≤ threshold agreed in ADR.

## Human evals

- [ ] **HE012-1** Tech lead + privacy owner approve OCR engine and data handling.
- [ ] **HE012-2** Reviewer confirms uncertain spans are visible, not hidden.
