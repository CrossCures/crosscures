<!-- gh-labels: type:build,area:web,area:voice,agent:ready | gh-milestone: M4 Patient Interaction -->
# PM-044: Voice turns — interruption, transcript correction, no duplicate answers

| Field | Value |
|---|---|
| Type | Design-lite (turn state machine in PR) + Build + Test |
| Milestone | M4 Patient Interaction |
| Depends on | PM-042; ADR-001 (mobile scope) |
| Blocks | PM-071 |
| v4 refs | §8 "Voice interaction", §14 |

## Context

Web uses browser `SpeechRecognition` + Cartesia TTS (`src/lib/cartesia.ts`, also proxied by `api/voice.py`); backend has MedASR (`stt_medasr.py`). No barge-in engine; no transcript correction; mobile is text-only. Web currently calls Cartesia directly from the browser — check that no API key is exposed client-side (guardrail 10); route through backend if so.

## Scope

1. Turn state machine: `speaking → listening → captured → reviewing → saved | failed`, with question identity preserved through interruption.
2. Barge-in: detected intentional speech stops TTS immediately; visible Stop button; question text always visible.
3. Recognized text shown for review/edit before save (esp. med names, numbers, units, dates); corrections stored as correction history on `PatientReport`.
4. Text fallback when mic permission/recognition/playback fails; state preserved.
5. Clear state labels: recording ≠ transcribed ≠ saved ≠ interpreted.
6. Turn id reused across retries → no duplicates.
7. Provider abstraction for STT/TTS (browser, MedASR, Cartesia) behind small interface; document where audio is processed; no audio retained unless decided.

## Test cases

- **T044-1** Unit: state machine transitions incl. interrupt during speaking → listening with same question id.
- **T044-2** Mic permission denied → text input focused; no error loop.
- **T044-3** Edited transcript saved; PatientReport keeps original recognized text + correction.
- **T044-4** Network drop after capture → retry submits once (same turn id).
- **T044-5** No Cartesia/STT secret present in built web bundle (grep `dist/` in CI).
- **T044-6** Captured-but-not-transcribed audio is never shown as a confirmed answer.

## Agent evals

- **AE044-1** Manual test log on desktop Chrome + iPhone Safari (or BrowserStack): interrupt, correct, fallback.
- **AE044-2** Measured TTS stop latency after speech onset (report ms).

## Human evals

- [ ] **HE044-1** Reviewer interrupts mid-question and answers; correction of a medication name works.
- [ ] **HE044-2** Privacy reviewer confirms patient-facing text accurately states where audio is processed.
