# Physician Feedback — Specification

## Goal

Instrument the **physician's pre-visit brief and detailed report** with lightweight feedback that helps the team identify errors, find missing information, and improve the usefulness of the app. The physician should be able to report a problem at the section or citation where it occurs and give a short account of whether the report helped the encounter.

The product target is the user's **MGH_App_Planning_Input_v4.docx**, including the additions for temporary original-note previews and a persistent database of app-generated summaries. This Markdown specifies how physician feedback fits that workflow. Version 4 defines the product behavior; feedback controls, response scales, and measurement conventions below are proposed details where version 4 leaves them open.

This remains the **Meso, per-episode feedback tier on the physician side**. Start with the physician because the physician can assess the clinical report against its sources and the encounter. The specification applies to conditions discovered in the active patient's records; it does not assume a particular diagnosis or that patient reports are inherently unreliable. Patient-side Micro/Macro satisfaction feedback remains backlogged. The patient's clinical check-in questions are core product functionality and are a separate activity from satisfaction feedback.

## Framing

The physician is reviewing a longitudinal, evidence-linked account, not just a summary of one uploaded note. The report combines chart-derived history with separately attributed interval patient reports, medication reconciliation, dated results, clinician recommendations, and unresolved gaps.

Keep the original three feedback axes:

- **Accuracy / Trust — precision-oriented:** is the displayed content faithful to the relevant evidence, dates, and uncertainty?
- **Completeness — recall-oriented:** is clinically useful information missing from the report or unavailable to the physician?
- **Utility / Impact — encounter outcome:** did the report make preparation or the encounter more useful or efficient?

These are actionable **reported signals**, not an exhaustive list of application failures or a validated measurement of clinical precision, recall, or benefit. A physician flag can reveal a problem, but the team still has to inspect its source and stage history to identify the cause. An unflagged section is not automatically correct. An unanswered completeness question is not proof that nothing was missing.

The central relevance criterion is version 4's **information that could change the physician's understanding or management**. This determines what evidence and omissions matter. It does not authorize the app to make treatment decisions. Feedback should improve faithful information collection and presentation, including useful uncertainty, rather than reward confident conclusions unsupported by the records.

### What must match the version 4 planning input

| Version 4 requirement | Consequence for this feedback specification |
|---|---|
| Web patient and physician experiences now; patient iPhone app later — sections 1 and 14 | Specify a usable web physician review. Source inspection and feedback need keyboard and touch access as well as pointer interaction. Do not make an existing native mobile screen a prerequisite. |
| Fasten import or PDF, DOCX, image/photo, and TXT upload — section 3 | Missing information may come from either intake route, document parsing, or OCR. Do not assume every record came through FHIR or that every unavailable record should have been imported. |
| Shared clinical/admin filtering before both one-shot and fragmented routes — section 4 | Trace omissions through the shared filter as well as the selected reasoning route. Neither route is evaluated against an unfiltered or silently truncated input. |
| Latest relevant clinical anchor plus review of the remaining history — section 5 | Assess problem trajectories, older unresolved problems, duplicate events, discrepancies, and dated results. A newer acute visit or result must not erase relevant chronic history. |
| Short physician brief with problem-oriented detail underneath — sections 6 and 9 | Feedback covers the opening brief and the detailed report. A concern in a subproblem, medication comparison, results table, or interval timeline needs a specific target. |
| Cross-referenced statements with temporary original-note windows — the user's section 1 addition | Put source inspection beside the claim being assessed. The window must show original evidence, remain usable while being read, and preserve the claim's patient and version context. |
| Four adaptive clinical question categories and medication reconciliation — section 7 | The report must retain what the patient actually answered, which gaps remain, and what changed. A missing or distorted answer can explain an accuracy or completeness issue. Feedback is not a fifth patient questionnaire. |
| Voice with interruption, visible text, and corrections — section 8 | When a report misstates an answer, the investigation can distinguish the saved/corrected patient report from its later model interpretation. Feedback does not require storing raw audio indefinitely. |
| Patient-friendly summary and clinician-recommended next steps — section 6 | Physician and patient outputs must agree on evidence and reporting period while using different wording. Do not require the patient's summary to use A&P format. |
| Three-day preparation cutoff — section 9 | The brief is available before the encounter. Reading or acknowledging it is not proof that the visit has finished. End-of-visit usefulness feedback needs a separate timing decision. |
| Persistent app summaries separate from source records — the user's section 2 addition and section 8 | Feedback belongs to the app's own versioned history. It does not modify imported originals or write into an external chart/EHR. |
| Configurable providers, stage prompts, and fresh experiments — section 11 | Connect feedback to the route, inputs, prompt/model configuration, and saved diagnostics of the relevant run. Do not attribute every error to one named model or enable reusable model-response caching. |
| Isolation and recoverable failure — section 12 | A flag must resolve to the exact patient, snapshot, report, and source. Failed feedback saving must not lose prior feedback or block access to the report. Failed chart processing must not publish a partial clinical report. |
| Camera and Watch integration spaces; optional visit recording — sections 8 and 13 | Base feedback must work without these future inputs. If added later, their observations/transcripts require explicit provenance and must not masquerade as clinician notes. |

## Feedback tiers (context)

| Tier | Actor | Cadence | Status |
|------|-------|---------|--------|
| Micro, satisfaction after an interaction | Patient | Per interaction | Backlog; distinct from required clinical check-ins |
| **Meso, quality of the brief/report** | **Physician** | **Per review episode and encounter** | **This specification** |
| Macro, relationship feedback or in-app NPS | Patient | Periodic | Backlog |

A **review episode** associates a physician, a patient, an appointment or encounter, and the particular report version being reviewed. The final rule for multiple physicians or multiple report versions in one visit remains an open measurement decision. Preserve those identities so the rule can be applied without losing the original feedback.

Hospital-collected NPS and CAHPS measures remain possible future comparison data, not dependencies for the prototype. CG-CAHPS concerns patients' experiences with clinicians and groups; HCAHPS concerns hospital care. The proposed app measures are physician reports about an AI-generated document and are not those surveys or equivalent scores. The hypothesized associations below require validation against the actual survey version and items collected. See the [AHRQ CG-CAHPS overview](https://www.ahrq.gov/cahps/surveys-guidance/cg/index.html) and [official HCAHPS measures reference](https://www.hcahpsonline.org/en/hcahps-star-ratings/).

## The three metrics

### 1. Accuracy / Trust — *precision-oriented*

- **What:** An optional **Flag as inaccurate** action on a substantive section, subproblem, or statement in the physician brief/report. A citation-specific flag can identify the particular source link within that section. A brief-level concern should not replace the ability to flag the exact content.
- **Why:** The physician needs to distinguish faithful synthesis from unsupported or misleading content. A citation is useful only if it supports the claim, belongs to the correct patient and snapshot, and is presented with the correct date and status.
- **Capture:** Save the target, exact report version, physician, and timestamp. Offer optional explanatory text; do not require the physician to write a correction or complete a rating scale before saving. Allow a mistaken flag to be corrected or withdrawn with history retained.
- **Action it unlocks:** Follow the report's evidence and stage history to investigate parsing, OCR, classification, extraction, interpretation of patient answers, composition, or citation grounding. These are possible causes to check, not a cause automatically established by the flag.
- **Statistic:** Report the proportion of eligible displayed section instances flagged inaccurate, with numerator, denominator, exposure definition, and response context visible. This is a reported flag rate, not independently measured precision.
- **CAHPS hypothesis:** More faithful information may support communication and coordination. The app has not established that lowering this flag rate improves a patient-experience score.

**What counts as an accuracy concern in this product:**

| Concern | Example of the distinction that must be preserved |
|---|---|
| Incorrect fact or numeric transcription | A lab value, unit, date, dose, route, or frequency differs from the supporting passage. Missing units must remain missing rather than being supplied from general knowledge. |
| Misleading time or status | A historical result is presented as current, an unmentioned problem as resolved, or an old recommendation as definitely still due. |
| Medication misclassification | A prescription, educational monograph, one-time administration, or proposed change becomes confirmed current use. |
| Order/result confusion | An order or specimen collection is presented as a completed result; a preliminary result is shown as final. |
| Unsupported causality or certainty | A new symptom is labeled a drug adverse effect without support, or a suspected condition becomes confirmed. |
| Patient-report distortion | “Less swelling but still tender” becomes “resolved,” or a patient's account is presented as a clinician-observed finding. |
| Citation or source-preview defect | The tag opens the wrong note, an unrelated passage, the wrong version, or fails to reveal the evidence needed to judge the claim. |
| Disagreement between audience summaries | The patient summary asserts an outcome that the physician report correctly labels uncertain, despite both using the same inputs. |

**Proposed counting convention:** use distinct `(review episode, brief version, section)` instances whose substantive content was displayed. Count an instance once if it has at least one current inaccurate flag; several citation flags within it do not multiply the section numerator. A flag on a child does not automatically flag its parent. Collapsed headings alone do not count as exposure. Display does not prove reading, so comparisons must also report participation and how exposure was defined. Confirm this convention before treating release-to-release changes as meaningful, particularly if the report hierarchy changes.

### 2. Completeness — *recall-oriented*

- **What:** At encounter end, ask **“Did you have to look elsewhere for something this brief should have had?”** Offer Yes and No, an optional description of what was missing, and the ability to leave the question unanswered.
- **Why:** A report can look accurate while omitting a clinically relevant problem, result, medication detail, interval answer, discrepancy, or follow-up status. The report should reduce the work of reconstructing the available history without hiding unresolved gaps.
- **Capture:** Attach the response to the review episode and report version used. The physician should not have to identify the pipeline failure or locate a source to submit an omission report.
- **Action it unlocks:** Determine whether the information was unavailable to the app, excluded during preparation, not extracted, not collected in follow-up, or present in the maintained record but missing from the final presentation.
- **Statistic:** Yes responses divided by answered completeness questions. Show eligible episodes, answered questions, and nonresponses separately. Do not turn a skipped question into No.
- **CAHPS hypothesis:** Having relevant information available may relate to coordination and access to information. This does not establish that the app measures those patient-experience domains.

Investigate omissions along the actual version 4 workflow:

| Where the gap may arise | What to inspect |
|---|---|
| Acquisition | Which records were available through the authorized Fasten connection or actually uploaded? A newer outside result absent from the snapshot is different from a result the app accepted and failed to read. |
| Parsing and OCR | Was each accepted document accounted for, and was the relevant passage readable? A failed parse must remain a processing error rather than an apparently complete new baseline. |
| Shared clinical filtering | Did a mixed page lose a clinician assessment, telephone note, result, or individualized instruction because it also contained administrative text or a handout? |
| Selected summarization route | Did the one-shot route account for all retained text within its verified limits? Did the fragmented route preserve the evidence while reviewing earlier notes? |
| Longitudinal reconstruction | Were older problems, medication history, actual reports, discrepancies, and labs/imaging over time connected to the current problem? |
| Patient information collection | Was a management-relevant gap identified? Was the relevant question asked, answered, skipped, or left unknown? Did a corrected voice/text answer reach the maintained record? |
| Report composition | Was information already in the validated app record omitted or placed where the physician could not find it? Was detail available beneath the brief but poorly signposted? |

When investigating a missing item, establish when it became available relative to the report's inputs and cutoff. Information first learned after the report was prepared is different from evidence available in time but dropped by the pipeline. The optional description can name what was missing and where the physician found it; the physician need not complete a technical failure analysis. Preserve the report's actual input dates when classifying the issue.

Completeness does not mean reproducing every source sentence or asking the entire gold-standard question bank. The four question categories—chart completion, possible future symptoms, current symptom trajectory, and medication tolerability—supply different types of interval information. Known stable facts should not be repeatedly requested. Unanswered questions and absent results remain visible gaps. Their absence must not be converted into negative findings or a claim that the patient never completed care.

### 3. Utility / Impact — *encounter outcome*

- **What:** At encounter end, ask **“Did this brief save you time and/or surface something you would have missed?”** Retain the proposed three choices: **No impact / Saved time / Changed my approach**.
- **Why:** A correct report may still be difficult to scan, repeat unchanged history, bury interval changes, or make source checking cumbersome. This signal helps assess whether the opening brief and the detailed problem view support the physician's work.
- **Capture:** One optional selection in the same small form as completeness. Do not infer a response from opening, acknowledging, or spending time on the report.
- **Action it unlocks:** Investigate ordering, level of detail, the named last-visit comparison, visibility of interval changes and gaps, and the ease of navigating from a claim to its original source. A No impact response may also reflect a familiar or uncomplicated case; it does not by itself prove that the content was wrong.
- **Statistic:** Distribution across the three responses among answered utility questions, with eligible episodes and nonresponses shown separately. Saved time is perceived benefit, not measured minutes. Changed my approach is a physician report, not proof of improved clinical outcomes.
- **CAHPS hypothesis:** Perceived usefulness might relate to broader experience ratings or willingness to recommend where those items are collected. The relationship remains to be tested.

The choices overlap: a report may both save time and change the physician's approach. A proposed minimal convention is **choose the option that best describes the effect on this encounter**. Confirm that convention, or revise the response design, before implementation. Do not silently treat the options as an ordinal clinical score or average them into a benefit score.

## Summary table

| # | Metric | Statistic | Reported concern | Pipeline investigation | External comparison hypothesis |
|---|--------|-----------|------------------|------------------------|--------------------------------|
| 1 | Accuracy / Trust | Distinct eligible section instances flagged / eligible section instances displayed | Wrong, stale, misattributed, or misleading content | Source preparation, evidence extraction, answer interpretation, composition, citation grounding | Communication and coordination |
| 2 | Completeness | Yes, information missing / answered completeness questions | Needed information unavailable, omitted, or difficult to find | Acquisition, parsing, shared filtering, chosen route, question/answer coverage, report organization | Coordination and access to information |
| 3 | Utility / Impact | Distribution among answered utility questions | Limited perceived value for the encounter | Brief hierarchy, relevance, interval comparison, source navigation | Overall experience or recommendation items actually collected |

Keep the metrics separate. A clinically important error must not be averaged away by positive utility responses. These product-quality measures do not create a patient urgency score, clinical alert, or escalation path.

## Capture design

### Report surface and source inspection

- **Review the brief and its detail.** The opening view describes the source coverage, named reference visit, interval changes, and important unresolved information. Show the report date and latest included patient-interaction date. Build published content from validated evidence. Problem sections contain chart-derived assessments, documented clinician plans, and separately labeled questions for review. Feedback must be available at the level where the concern appears, including medication reconciliation and longitudinal results.
- **Tag statements to evidence.** On desktop, hovering over a statement or its source tag opens a temporary window containing the original note, with the supporting passage in view and enough surrounding text to assess it. Identify the document and recorded date. Expose all supporting sources when a statement depends on several passages.
- **Make the temporary window usable.** Keep it open as the pointer moves from the statement into the window and while the physician reads or scrolls inside it. Close the transient preview when the pointer leaves that interaction region. Keyboard focus inside the window should preserve it until focus leaves or the user dismisses it. Exact delay and placement remain UI choices.
- **Support explicit access.** Clicking, keyboard activation, or tapping must open the same source without requiring hover. Provide an explicit close action and a readable source view on narrow screens. For a scan, retain access to the original image alongside extracted text; do not replace original prose with another generated paraphrase.
- **Keep source types distinct.** A chart claim opens its original chart passage. An interval patient-report claim opens the dated saved answer, with its report label and correction history. A future recorded-visit transcript remains an attributed app transcript rather than an authenticated clinician note.
- **Place feedback near the evidence.** An accuracy action on the section or citation retains the source-preview context and exact report version. A failed source preview shows its failure; it never substitutes another patient's note or a newer unrelated source.

### Timing and friction budget

**While reading:** accuracy flags are optional and require no free text. The physician can inspect and acknowledge a report without submitting feedback. Acknowledgement does not certify that every statement is correct.

**Before the visit:** version 4 prepares the report three days before the appointment and stops scheduled AI questioning for that cycle. The precise 72-hour versus local-calendar-day interpretation remains a planning decision. The patient can still access the friendly summary and applicable clinician-task reminders. None of this means that a physician has already used the report during a completed encounter.

**At encounter end:** show completeness and utility together, aiming for two selections and one save action when both are answered. Free text is optional for accuracy and completeness. An unanswered field stays unanswered. The proposed trigger is an explicit end-of-visit review action; if the form is placed beside acknowledgement, establish that the encounter has finished rather than assuming acknowledgement always occurs then.

Choose every eligible encounter versus a defined sampling policy later. Also define whether and when an unfinished form remains available. Do not repeatedly prompt the physician for the same episode or require survey completion to access the clinical report. All prototype status and reminder surfaces stay inside the app; this specification adds no outbound patient message.

### Version changes and corrections

The app may generate another report after a new source snapshot, a new patient answer, a corrected interpretation, or a prompt experiment. Feedback submitted from an older open report must remain attached to that exact version. Show that a newer version exists where appropriate, but do not silently move the flag to a rewritten sentence or attach an old utility response to a different report.

The existing version 4 decisions about voluntary updates after cutoff, rescheduled/cancelled visits, and already-active conversations remain open. Feedback must preserve the report history whichever policy is chosen. A cancelled appointment or an unknown appointment date cannot silently count as a completed encounter in the metrics.

## Where it hangs in the application

Use version 4's **single modular application** and small typed boundaries. Model calls, data access, authorization, and scope validation remain in the backend. The browser submits feedback and consumes typed responses. A separate service, vector database, or general plugin framework is not needed for this feature.

- **UI:** the web physician brief/detail view, its original-source preview, and the eventual acknowledgement/end-of-visit interaction. The patient summary keeps its own plain-language presentation and is not converted into a physician rating screen.
- **Backend:** a physician-feedback submission/read path beside report access, using the application's eventual authentication and patient-access rules. Validate the report, patient, episode, and optional section/citation relationships before accepting a submission.
- **Persistence:** save feedback in the app's own database with its generated summaries and their histories, while keeping feedback records distinct from clinical evidence and source documents. Persisted app summaries are readable without rerunning the chart; this does not enable cached provider responses to substitute for fresh model calls in V1.
- **Diagnostics:** resolve the flagged report to its snapshot, included patient reports, run, selected route, relevant stages, prompt/model configuration, and saved validation diagnostics. Keep provider keys in the approved backend secret store and out of feedback, exports, logs, or prompts.
- **Events or audit entries:** record successful submission with a durable relationship to the saved feedback. `BRIEF_FEEDBACK_SUBMITTED` with `source = physician` is a possible event name if an event taxonomy exists. Retrying a save must not produce duplicate counted feedback or a success event for a failed save.

The earlier Markdown named `brief_generator.py`, `physician.py`, `brief-detail.tsx`, a native `brief/[id].tsx` screen, `EventDB`, and an existing acknowledge endpoint in a separate `crosscures` layout. Those names are **unverified integration references**, not established capabilities or required file locations in version 4. The later engineering plan must inspect the actual code and choose the appropriate integration points. This specification does not prescribe an endpoint or class merely because the old note named one.

## Proposed data model (sketch)

Use one consistent feedback record shape for all three metrics. The names below are conceptual fields, not a commitment to an ORM class, schema migration, or particular database product.

| Field | Meaning and validation |
|-------|------------------------|
| `id` | Unique feedback identity; preserve it across correction history. |
| `brief_id` and `brief_version_id` | Identify the exact physician brief/report reviewed, not whichever version is newest at submission time. |
| `review_episode_id` | Associates the review with a physician, patient, and visit context. Define the aggregation rule for multiple reviewers or versions. |
| `appointment_id` / encounter reference | The relevant visit when known; unknown or cancelled status must remain explicit. |
| `physician_id` | The authenticated reviewer. Do not trust a client-supplied reviewer identity without authorization checks. |
| `patient_id` | Must agree with the report and authorized patient context. No cross-patient targets or rollup leakage. |
| `metric` | `accuracy`, `completeness`, or `utility`. |
| `section_id` / `statement_id` | Accuracy target within this report version. A particular claim may be identified beneath a section. Not required for brief-level completeness or utility. |
| `citation_id` | Optional accuracy target; must belong to the specified statement/section and report version. |
| `response` | Metric-specific value: an inaccurate flag; Yes/No for completeness; one of the three utility choices. Unanswered is not a negative response or zero score. |
| `free_text` | Optional explanation for accuracy or completeness. Feedback text is user-supplied data, not instructions to an agent or model. |
| `capture_phase` | For example, while reading or after the encounter; distinguish this from acknowledgement and report generation. |
| `created_at` and revision metadata | Timestamp, correction/withdrawal state, and history of changes without erasing earlier submissions. |
| Retry/submission identity | A stable submission token or equivalent mechanism so a network retry does not duplicate a response. |

The report-version relationship must also resolve to the **chart snapshot, included patient-answer versions, analysis run, filtering version, summarization route, relevant prompt and model settings, schema/implementation versions, and application release**. These can be linked through the report/run rather than redundantly copied into every feedback row. Preserve them when models or prompts change so an investigation can reproduce the reviewed context.

Keep a **source snapshot**, an **app summary version**, and a **feedback revision** distinct. A changed imported file creates a source snapshot. A newly incorporated patient answer or regenerated summary creates an app version without rewriting the source. A physician flag creates feedback about that output; it is not a new chart finding or an external medical-record edit.

## Failure handling and the improvement loop

1. **Save truthfully.** Show pending, saved, or failed feedback state. If saving fails, preserve the unsent response for retry and keep already saved feedback intact. Feedback failure must not block source inspection or report access.
2. **Validate the target.** Reject references to another patient, an incompatible snapshot, a nonexistent section, or a citation outside the selected report. Do not repair the request by guessing another target.
3. **Preserve clinical publication rules.** A processing or provider failure retains accepted uploads, answers, prior plans, and dated valid reports. Do not publish a partial new clinical report to obtain feedback on it. A last valid report may remain accessible with its date and update-pending status; feedback stays on that version.
4. **Investigate before changing.** Follow the source links and stage diagnostics to distinguish missing acquisition, lost clinical text, extraction error, answer misinterpretation, and final presentation. A physician comment can be valuable without being automatically established clinical truth.
5. **Make a controlled improvement.** The team can change a stage prompt, provider adapter, extraction rule, or presentation and make a fresh scoped experiment against the appropriate validated inputs. Preserve earlier outputs and compare evidence fidelity and coverage; do not replay old model responses as a new run.
6. **Publish only validated outputs.** Any corrected app summary receives a new attributable version after its required checks. Feedback alone does not silently rewrite a report, train a model, alter a patient's treatment, create an alert, or write back to an EHR.

The persistent history of sources, patient reports, summaries, and quality feedback supports continuity and product improvement. The requested separate app database does not turn the app into the official medical record or authorize unspecified cross-patient reuse or secondary training.

## Example in the version 4 workflow

Use the **synthetic Charlie replay from version 4, section 16**, keeping its historical chart dates and invented app interactions distinct. The example's 21 March 2022 appointment and 18 March cutoff illustrate the proposed 72-hour rule; they are not a universal cadence or current clinical facts.

- **Inspect a claim:** the physician opens the finger-problem section and hovers over its culture citation. The source preview shows the original 26 February finding, **2+ mixed skin flora**, with its note context. The prior clinician's suspected organism remains separate from the actual result.
- **Report an accuracy defect:** in a negative test where the brief incorrectly treats that suspicion as confirmed, the physician flags the specific statement/citation. The flag points to the erroneous report version and original evidence. It does not alter the culture or automatically create a replacement clinical fact.
- **Check a patient report:** the interval statement about reduced swelling opens the dated patient answer. Persistent tenderness must not become “resolved,” and the 14 March absence of an update must not become “no symptoms.” This uses the same attribution rules for the patient-friendly and physician summaries.
- **Report missing information:** in an additional invented feedback interaction, the physician needed a newer outside result that was not in the imported snapshot. A Yes completeness response and optional description guide acquisition/coverage review. That is different from finding a supplied result that the app omitted. Do not add the imagined result as a chart fact.
- **Report usefulness:** the physician may select Saved time after the encounter. Store that response against the reviewed episode and version. It does not claim measured minutes or prove a better outcome.

Version 4's Appendix A remains the clinical expectation for the supplied chart. For example, the gold-standard answer's later vitamin D value and claimed AST/ALT normalization are unsupported by the supplied chart and must not become expected facts. Feedback evaluation should expose such errors rather than reward a verbatim match to the reference answer.

## Acceptance checks

| Scenario | Required outcome |
|----------|------------------|
| Both reasoning routes | Accuracy and omission feedback can be traced through shared filtering and either selected route, with comparable source coverage. |
| Mixed clinical and education text | A missed individualized instruction or clinician note is distinguishable from appropriate removal of generic handout content. |
| Clinical distinctions | Exact values/units/dates survive; prescriptions stay distinct from actual use, orders from results, and patient reports from clinician findings. |
| Source preview | The pointer can enter and scroll the original-note window; leaving the interaction dismisses it; keyboard and touch can inspect the same evidence. |
| Several supporting sources | All relevant source links are available, and none is presented as support for a different patient's or version's claim. |
| Old report still open | A newly generated report does not move existing or newly submitted feedback off the version actually reviewed. |
| Review before appointment | Opening or acknowledging the three-day report does not submit encounter-end completeness or utility feedback automatically. |
| Missing/changed appointment | Unknown, rescheduled, and cancelled visit states do not silently create completed-encounter feedback or duplicate counts. |
| Small optional form | Accuracy requires no explanation; completeness and utility can be answered in the intended small form; skipping does not block clinical work. |
| Denominators | Unflagged, unanswered, not displayed, and No impact remain distinguishable. Multiple flags and retries do not inflate the section rate. |
| Isolation | Cross-patient report/section/citation references are rejected, including when the browser switches patients. |
| Save or provider failure | Accepted sources, prior answers, valid reports, and saved feedback remain intact; unsent feedback has a retry path and no partial new clinical report is published. |
| Separate app database | Report and feedback history persists without changing source snapshots, writing to an external chart, or caching provider responses for reuse. |
| Product boundary | No clinical alert, urgency score, escalation, autonomous medication change, or outbound patient message is introduced by feedback. |

Use the supplied synthetic chart and a second distinct synthetic patient for isolation checks. These are expected behaviors for later verification, not claims that any current implementation already passes them. No live provider, Fasten, voice, or native-device behavior is established by a feedback test alone.

## Out of scope (backlog)

- Patient satisfaction feedback after each interaction, periodic patient relationship feedback, and in-app NPS. This backlog does **not** defer the four clinical question categories, medication reconciliation, or the patient-friendly summary required by version 4.
- Direct CAHPS survey administration or a validated correlation study. Capture the proposed physician signals without presenting them as survey scores.
- A native iPhone implementation now. Preserve accessible interactions and portable backend contracts for later phone work.
- Clinical alerts, urgency scores, escalation, automated treatment changes, and outbound patient messages. Routine prototype status and reminders remain in-app.
- EHR writeback or reintegration. The app maintains its own documents and keeps referencing preserved sources.
- Reusable model-response caching, automatic training from feedback, or automatic prompt changes. Retain audit records and use fresh, controlled experiments under the version 4 rules.
- Camera-based grading and Apple Watch collection beyond their defined integration spaces; automatic recording of a visit. Optional recording needs its own inclusion and handling decisions.
- New analytics infrastructure or mandated external-code classes/endpoints solely to support this specification.

## Open questions

- **Feedback scope and burden:** which eligible encounters are prompted, and is capture every visit or sampled? How long does an unfinished form remain available without repeatedly interrupting the physician?
- **Timing:** what explicit event establishes that the encounter has finished? How will acknowledgement remain independent when the brief is read three days beforehand?
- **Accuracy control:** start with a simple inaccurate flag or add an explicit assessment scale? Are citation-specific flags included initially, and how are corrections/withdrawals presented?
- **Utility response:** keep a single “best describes the effect” choice or accommodate overlapping saved-time/changed-approach responses? Keep the measure categorical until justified otherwise.
- **Counting rules:** what precisely counts as section exposure? How are parent/child sections, several physicians, multiple report revisions, and revised submissions handled in episode and visit rollups?
- **Report lifecycle:** apply the version 4 decisions for the exact cutoff, late voluntary reports, post-cutoff corrections, missing appointments, rescheduling, and cancellations. Do not settle these implicitly in feedback code.
- **Investigation ownership:** who reviews reported issues, how are findings recorded, and how are a corrected report and the original flag linked without silently changing clinical facts?
- **Practical integration:** which actual screens, API boundaries, identifiers, storage, and audit conventions support the required behavior? Verify these during engineering planning instead of assuming the old external paths exist.
- **External measures:** which CG-CAHPS/HCAHPS versions, reference periods, and items are actually available? What approved matching and aggregation would test the proposed relationships with app feedback, without treating physician and patient reports as interchangeable?

The immediate deliverable is this revised Markdown specification aligned to the user's version 4 planning input. Engineering task breakdown and implementation follow only after review.
