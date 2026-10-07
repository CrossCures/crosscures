<!-- gh-labels: type:build,area:web,agent:ready | gh-milestone: M1 Source-of-Truth Intake -->
# PM-014: Patient intake UI — two entry buttons, file states, truthful failures

| Field | Value |
|---|---|
| Type | Design-lite (wireframe in PR) + Build + Test |
| Milestone | M1 Source-of-Truth Intake |
| Depends on | PM-010, PM-013 (PM-012 for image states) |
| Blocks | PM-071 |
| v4 refs | §2 step 1, §3 "Patient entry screen", §14 |

## Context

Web `pages/patient/records.tsx` advertises only `.json`/`.pdf` and embeds `components/FastenConnect.tsx`.

## Scope

1. Entry screen with exactly two primary actions: **Import records** (Fasten) and **Upload medical records** (multi-file: PDF, DOCX, TXT, JPG/PNG/HEIC).
2. Per-file list with state and plain-language reason for rejection/failure; "processing paused" message when a required item is unreadable; retry without re-upload.
3. Processing status that shows progress, not clinical conclusions.
4. Responsive (390 px), keyboard accessible, touch targets ≥ 44 px; drag-and-drop optional, never required.
5. No model/prompt choices exposed to the patient.

## Test cases

- **T014-1** vitest: renders exactly two primary buttons with accessible names.
- **T014-2** vitest: file input `accept` includes pdf, docx, txt, image types.
- **T014-3** vitest: rejected file shows its reason; accepted file shows "Saved".
- **T014-4** vitest: `import_partial` state lists missing items.
- **T014-5** Keyboard-only: can open file picker and trigger import (testing-library user-event).

## Agent evals

- **AE014-1** Screenshots at 1280 px and 390 px for: empty, uploading, mixed accepted/rejected, processing, failed.
- **AE014-2** axe-core (vitest-axe) reports 0 serious violations.

## Human evals

- [ ] **HE014-1** Non-technical reviewer can upload files and explain what happened to each one.
- [ ] **HE014-2** Wording reviewed for patient friendliness; no clinical claims during processing.
