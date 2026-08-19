# Physician Feedback — One-Pager

## Goal

Instrument the **pre-visit brief** — the hierarchical, citation-rich summary the
physician reads at the start of a visit — with lightweight feedback that lets us
**take action and improve the app**. This is the Meso (per-episode) feedback tier
on the **physician** side.

We start here, not on the patient side, because the brief has a qualified judge
(the physician) and it avoids relying on feedback from patients who may have
Parkinson's-related reliability/confusion concerns. The patient-side feedback
matrix (Micro/Macro) is explicitly **backlogged** for now.

## Framing

The brief is an **AI summarization system**, so it has exactly two failure modes
plus one outcome question. Each maps to a different part of the pipeline, so each
is independently actionable:

- **Precision** — is what's in the brief *correct*?
- **Recall** — is anything important *missing*?
- **Utility** — did it actually *help* the encounter?

## Feedback tiers (context)

| Tier | Actor | Cadence | Status |
|------|-------|---------|--------|
| Micro (per-interaction) | Patient | Every interaction | Backlog |
| **Meso (per-episode)** | **Physician** | **Per visit / per brief** | **This spec** |
| Macro (relationship) | Patient (in-app NPS) | Periodic | Backlog |

Outer layers already identified: hospital-collected **NPS** (annual/semi-annual)
and physician-cared metrics (**CAHPS**, patient experience). CAHPS here means the
umbrella family; the outpatient-visit instrument that fits the brief is
**CG-CAHPS** (Clinician & Group), with **HCAHPS** applying at the hospital rollup.
The in-app metrics below are **upstream proxies/drivers** of specific CAHPS
composites — not the survey items themselves — designed so we can correlate them
to CAHPS later.

## The three metrics

### 1. Accuracy / Trust — *precision*

- **What:** Section- and citation-level "Is this correct?" flag the physician can
  hit on any node of the hierarchical brief while reading it.
- **Why:** A citation-rich brief lives or dies on trust. One confidently-wrong,
  cited claim and the physician stops relying on the whole thing.
- **Action it unlocks:** Flags point straight at the generation + citation-grounding
  step ([brief_generator.py](../artifacts/crosscures-api/crosscures_v2/stages/pre_visit/brief_generator.py))
  — hallucinations, misattributed citations, stale data. Track *% sections flagged
  inaccurate* and drive it down release over release.
- **CAHPS linkage (proxy):** CG-CAHPS **"How well providers communicate"** and
  the **Care Coordination** composite (*providers' use of information to
  coordinate care*); HCAHPS **"Communication with Doctors."** Accurate inputs →
  accurate physician communication.

### 2. Completeness — *recall*

- **What:** At visit end, one prompt — "Did you have to look elsewhere for
  something this brief should have had?" (optionally: what?).
- **Why:** The invisible failure — the brief looks fine but omitted the labs / med
  / history that mattered. This is the signal physicians will silently resent if
  we never ask.
- **Action it unlocks:** Points at the *ingestion + summarization coverage* layer
  (Fasten/FHIR ingest → what gets pulled and what the summarizer includes). Tells
  us what to ingest more of and what the brief's section model under-weights.
- **CAHPS linkage (proxy):** CG-CAHPS **Care Coordination** (*provider had the
  information they needed about your care*) and **"Getting timely information."**

### 3. Utility / Impact — *outcome*

- **What:** One tap at visit end — "Did this brief save you time and/or surface
  something you'd have missed?" (3-point: *no impact / saved time / changed my
  approach*).
- **Why:** Accuracy and completeness measure *quality*; this measures *value*. An
  accurate, complete brief that changes nothing means we're summarizing the wrong
  things.
- **Action it unlocks:** Drives *content prioritization and the brief hierarchy
  itself* — which sections lead, what's worth generating at all.
- **CAHPS linkage (proxy):** CG-CAHPS **Provider Rating (0–10)** and **Would
  Recommend**; HCAHPS **Overall Rating**. Closest in-app proxy for the global
  experience/efficiency story.

## Summary table

| # | Metric | Statistic | Failure mode | Pipeline lever | CAHPS proxy |
|---|--------|-----------|--------------|----------------|-------------|
| 1 | Accuracy / Trust | % sections flagged inaccurate | Precision (wrong content) | Generation + citation grounding | Provider communication / care coordination |
| 2 | Completeness | % visits with "info missing" | Recall (missing content) | Ingestion + summarization coverage | Care coordination / timely information |
| 3 | Utility / Impact | Distribution over no-impact/saved-time/changed-approach | Low value | Content prioritization + hierarchy | Provider rating / recommend |

## Capture design

- **Metric 1 is section/citation-level, not global.** Because the brief is
  hierarchical and citation-rich, attach the flag to each `sections` node (and
  optionally each `citations` entry). This yields localized signal traceable to
  the exact retrieval + generation step that produced the flagged node —
  far more actionable than one blanket thumbs. Brief `sections` and `citations`
  already exist on the payload returned by
  [physician.py `get_brief`](../artifacts/crosscures-api/crosscures_v2/api/physician.py).
- **Metrics 2 and 3 are visit-level**, prompted at brief acknowledgement / visit
  end (2–3 taps total).
- **Friction budget:** metric 1 is passive/optional while reading; metrics 2 and 3
  are a single end-of-visit micro-form. No free-text required (free-text optional
  on 1 and 2).

## Where it hangs in existing code

- **UI:** extend the physician brief detail view
  ([brief-detail.tsx](../artifacts/crosscures/src/pages/physician/brief-detail.tsx),
  mobile [brief/[id].tsx](../artifacts/crosscures-mobile/app/(physician)/brief/%5Bid%5D.tsx))
  — add section flags + an end-of-visit prompt alongside the existing acknowledge action.
- **API:** extend the physician router
  ([physician.py](../artifacts/crosscures-api/crosscures_v2/api/physician.py)),
  next to `POST /briefs/{brief_id}/acknowledge`, with a feedback endpoint.
- **Events:** emit through the existing taxonomy in
  [events/models.py](../artifacts/crosscures-api/crosscures_v2/events/models.py)
  (add `BRIEF_FEEDBACK_SUBMITTED`, `source = physician`), persisted via `EventDB`.

## Proposed data model (sketch)

A single generic `PhysicianFeedbackDB` rather than per-metric tables:

| Column | Notes |
|--------|-------|
| `id` | PK |
| `brief_id` | FK → `PhysicianBriefDB` |
| `physician_id` | FK → `UserDB` |
| `patient_id` | FK → `UserDB` (denormalized for rollups) |
| `metric` | `accuracy` \| `completeness` \| `utility` |
| `section_id` | nullable; set for metric 1 (section/citation node) |
| `citation_id` | nullable; set when the flag is on a specific citation |
| `score` | small int / enum per metric |
| `free_text` | nullable |
| `created_at` | timestamp |

Keyed to `brief_id` (+ optional `section_id`/`citation_id`) so accuracy flags are
node-scoped while completeness/utility are brief-scoped.

## Out of scope (backlog)

- Patient-side Micro/Macro feedback matrix (reliability concerns for Parkinson's
  patients; risk of confusion with existing app workflows).
- In-app patient NPS.
- Direct CAHPS survey administration — we capture **proxies** only and correlate
  later.

## Open questions

- Exact score scales per metric (binary flag vs. 3-point) — start minimal.
- Whether to prompt metrics 2/3 on every visit or sample to limit fatigue.
- Correlation plan: how/when we join in-app proxies to hospital CG-CAHPS/HCAHPS
  results to validate the mapping.
