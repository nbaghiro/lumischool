# Interactive teaching and Gemini tutoring implementation plan

Status: ready for approval, 25 September 2026. Planning only; no runtime changes or API calls made.
Companion: [experience exploration](tutoring-experience-exploration.md).

Approval of this plan authorizes implementation and adult QA through phases 0–6 below. Phase 7 is the
child rollout gate; provider eligibility is deferred to that gate, not a blocker on engineering.
Microphone input and real-time voice conversation are a separately scoped follow-on, not a hidden
requirement for completing this plan.

## 1. Product decisions

Build one shared teaching runtime with:
- Guided lesson teaching, presented on a large interactive board.
- Contextual question help, presented inline and expandable into that same board.
- Gemini choosing and wording the next teaching move from grounded material and supported actions.
- Existing checkers owning correctness and all earned progress.
- Selectable illustrated tutors, Gemini narration and device-voice fallback.
- Prepared teaching that works when live generation is disabled, unavailable or inappropriate.

The default remains the current worksheet until a parent enables guided entry. On supported lessons,
Teach me opens the board; Help opens the compact view. Back to work preserves the child's answer,
scroll position and teaching step. No separate AI chat tab or second lesson identity.

Prototype and integrate three skill slices first: addition across ten, reading/comprehension, and food
chains. All other lessons retain existing help. This plan delivers a complete extensible runtime and
three end-to-end teaching slices, not an unreviewed generated rewrite of all 336 lesson files.
After validation, expand in skill batches using the authoring pipeline in section 8.

Explicit changes to earlier decisions in ai.md, effective only when this plan is approved:
- Permit grounded, model-written explanations in enabled tutoring sessions.
- Permit a minimal tutoring context at the server, distinct from the authoring-only envelope.
- Permit parent-selected guide appearance, delivery style and service-generated narration.
- Preserve no direct child-to-provider connection, authoritative local checking and parent controls.
- Do not add a general-purpose chatbot, pretend-human tutor, social memory or automatic essay/art marking.

## 2. Concrete child and parent UX

### Lesson teaching

The board replaces the central lesson surface while expanded. Keep a compact top bar with return,
lesson title and pause. Use the app's paper and existing illustrations, keeping the main visual large.
A small tutor sits beside the current caption. A lower response area contains only the current task.
Replay/sound controls remain reachable; no persistent transcript, stage decorations or multiple tabs.

Sequence: notice a concept, watch one demonstration, complete a step together, try independently,
then recap. These are runtime phases, not navigation tabs. Advance after a child's action or an explicit
Continue press, not merely after narration finishes. Pausing and replay never count as a new attempt.

Desktop: centered board with scene aspect ratio preserved, caption and controls adjacent/below.
Phone: scene above caption and response, with readable diagrams and 44px targets. Avoid clipping to
force a desktop scene onto a narrow screen. Keyboard, captions and reduced-motion modes are required.

### Question help

Help initially shows one short instruction and an action. Show me requests demonstration; Another way
requests a different representation or explanation; Read it replays approved text. Expand exposes the
board without restarting. Ask a grown-up remains available. Controls appear when meaningful.

A first wrong answer is evidence, not a diagnosis. The tutor may ask a diagnostic question before
selecting an explanation. A demonstrated solution is allowed when needed, with its assistance recorded;
a fresh related problem then checks independent understanding. Never trap a child behind endless hints.

Initial stopping policy: after two unsuccessful support checks, offer a prerequisite bridge; after two
further unsuccessful checks, offer an adult handoff or break. Do not force a child to finish the bridge.
These defaults are versioned policy parameters and can change based on QA evidence.

### Tutor and voice settings

In existing parent teaching settings, add:
- Teaching: worksheet / guided entry.
- Help: existing authored help / adaptive Gemini help.
- Tutor appearance: world guide by default, two existing guide alternatives, or no character.
- Delivery: concise / more step-by-step; this changes explanation length, not correctness or grading.
- Read aloud: off / device / Gemini; speed slow / normal.

Use existing guide art and poses. No new art-generation dependency. Do not alter the selected world's
map guide when the parent chooses a lesson tutor. Provide a short adult preview for every appearance
and voice. Gemini speech uses a mapped approved stock voice, never voice cloning.

Parent-only QA can run fictional sessions and preview real lesson content without changing a child's
record. Child-mode settings remain off until rollout. Existing settings and hint policies stay compatible.

## 3. Code ownership and boundaries

| File or area | Responsibility |
|---|---|
| `engine/teaching.ts` (new) | Step/action types, schema version, pure reducer, interruption and restore |
| `engine/ui/teaching.tsx` and `.css` (new) | Shared compact/expanded renderer and controls |
| `engine/ui/tutor.tsx` | Reuse guide rendering; accept validated lines and delivery state |
| `engine/ui/voice.ts` plus teaching audio adapter | One audio owner; device fallback, cancellation and replay |
| `school/tutoring.ts` (new) | Teaching policy, candidate selection, bridges, assistance and transfer checks |
| `school/assistant/tutoring.ts` (new) | Separate bounded tutoring envelope and prompt version |
| `server/gemini.ts` | Shared server-only transport/config; preserve authoring behavior |
| `server/tutoring.ts` (new) | Sessions, authorized turns, validation, budgets and provider calls |
| `server/db/tutoring.ts` (new) | Family-scoped operational session/turn persistence |
| `engine/pack.ts`, notation compiler/checker | Optional teaching sequences and validated references |
| `content/curriculum/teaching/` (new, update loader) | Reviewed skill teaching materials compiled with content |
| `apps/kids/lesson.tsx`, `apps/kids/teaching.ts` | Existing lesson integration and settings parsing |
| `apps/home/` existing teaching settings | Adult preview, preference changes, feature controls |
| `.scratchpad/tutoring.html` (new) | Adult development comparison using the same runtime |
| `tools/scripts/evaluate-tutoring.ts` (new) | Repeatable fictional-case Gemini evaluations |

Update boundaries.ts explicitly: teaching core stays DOM-free; UI imports core; school owns pedagogical
policy; server may import those pure contracts and policy; kids imports neither server runtime nor
notation compiler. Transport DTOs remain in server/api.ts as type-only contracts, following the repo.
Production never imports scratchpad. Split modules only when they hold distinct concepts.

## 4. Teaching material and runtime contracts

A compiled `TeachingMaterial` contains:
- `id`, `version`, source hash, skill, supported grade/reading bands and language.
- Reviewed concept facts with stable IDs; terminology; allowed alternative explanations.
- Misconception hypotheses and diagnostic material references.
- Demonstrations with existing scene references and declared anchors.
- Supported interaction/checker references and independently checked answer data.
- Prerequisite bridge references and fresh transfer-question references.
- Default authored sequence and fallback text for each step.

Validate references and cycles at content build time. Existing lesson prerequisites are not sufficient:
lesson completion does not prove every underlying skill. Bridge links are explicitly authored and
bounded to at most one nested bridge in the first implementation.

The first action vocabulary:
`explain`, `highlight`, `reveal`, `demonstrate`, `ask`, `bridge`, `return`, `recap`, `handoff`.
Each action references a compiled material/step and its allowed anchors/options. The model cannot
invent scene geometry or numerical exercise parameters. Demonstrations use authored transformations,
with static equivalent frames for reduced motion. Additional actions extend this union and its tests.

The server response contains an accepted `TeachingStep` or a deterministic fallback step:
- `stepId`, `revision`, `materialId`, `materialVersion`.
- `phase`: notice / model / together / independent / recap.
- `action`, bounded `caption`, `spokenText`, `factIds`.
- Optional `sceneActionId`, `questionRef`, `bridgeId`.
- Assistance level and origin: authored / Gemini; origin set by server, never trusted from model.
- Available child actions derived by policy, not arbitrary model-provided button text.

Model output is a narrower `TutorProposal`: intent, material reference, caption, spoken text,
fact references and an optional diagnostic/scene action reference. It cannot assign IDs, revisions,
authorization, grades, completion or assistance credit. Short explanation limits: 40 words for concise,
70 for step-by-step; a diagnostic prompt up to 25 words. Limit one teaching move per turn.

Reducer states: ready, requesting, presenting, awaiting-response, paused, returning, ended.
Speech playback is a separate state so failed audio cannot block interaction. Events include request,
accepted-step, child-response, pause, resume, replay, expand, collapse, return and dispose. All async
results carry session/step/revision and are ignored if stale. Pause stops audio and cancels pending work;
resume uses the accepted step or makes a new request, never advances a hidden step.

Restore stores only accepted state. Keep unsent lesson answers in the existing sync path. On reload,
restore the original question and last accepted teaching step; never automatically repeat a paid call.
If a content hash changes, retire that teaching session and return safely to the current lesson.

## 5. Gemini integration

### Transport and configuration

Use server-side HTTPS with `x-goog-api-key`, never a key in a URL or browser bundle. Extend existing
fetch-based integration rather than require an SDK. Keep all provider parsing behind one adapter.
Use the currently documented Interactions API for new tutoring calls, with `store: false`; preserve
existing authoring tests while moving its credential to a header. Pin API and prompt adapter versions.
Do not store provider conversation IDs or depend on provider-side memory.

Configuration:
- `GEMINI_API_KEY`; accept `GOOGLE_API_KEY` as a documented fallback only if the former is absent.
- `GEMINI_TUTOR_MODEL`, `GEMINI_AUTHOR_MODEL`, `GEMINI_TTS_MODEL`: separate explicit deployment IDs.
- Initial candidate: `gemini-3.8-flash` for tutoring and authoring, `gemini-3.8-flash-tts` for narration,
  as listed in the official documentation inspected for this plan. Confirm account availability in the
  phase-0 smoke test, and record exact returned model version. No silent model upgrades/fallbacks.
- `TUTORING_ENABLED`, `TUTORING_CHILD_ENABLED` (both default false).
- Per-family daily call and monthly token ceilings configured server-side; narration has its own cap.
- Local env discovery reports only configured/missing status; never log keys, headers or full env files.

### Three Gemini operations

1. **Authoring:** draft a concept explanation, diagnostics and a teaching sequence from supplied lesson
   material. Output structured proposals for verification and adult review, never directly published.
2. **Live tutoring:** choose one next move and phrase it using the trusted concept material, concrete
   question, recent evidence and allowed actions. One response per turn; no autonomous agent loop.
3. **Narration:** speak only the final validated `spokenText` with approved voice/delivery settings.
   No new instructional content may be invented in the audio operation.

Turn request context is built server-side: current verified task/answer facts, last four relevant
attempts, last four accepted teaching steps, relevant prerequisite evidence, selected materials,
delivery preference and allowed moves. Limit source snippets and total serialized context to 24KB.
Use an instructional band, not name/birthdate/location. Short child questions remain off in the first
release; interactions and fixed requests already express the useful help intents. The contract leaves
room for a separately permitted question input later.

Prompt order: immutable teaching instructions; trusted facts; allowed actions/materials; delimited
untrusted response evidence; requested schema. Treat evidence as data, never instructions. Explain
one move; acknowledge uncertainty; ask a diagnostic question when evidence is ambiguous; don't
invent a misconception, personal detail, diagram or answer. Prompt and schema version together.

Request structured JSON with the supported JSON Schema subset. Parse as unknown and validate locally,
including sizes, exact references, allowed phase transitions and scene anchors. Cross-check numerical
claims against computed facts; arbitrary prose remains subject to evaluation and cannot be called
formally verified. Source citations alone do not prove an explanation faithful.

Handle empty candidates, safety blocks, malformed JSON, unsupported actions and response truncation.
Reject before rendering or speech. One corrective request is allowed only within the remaining time
and token budget; otherwise use the compiled fallback. Never lower validation or safety settings to
force a response. No browser, search, code execution, filesystem or unrestricted function tools.

### Latency and failure policy

Initial engineering targets, to validate rather than claim achieved:
- Cached/authored help appears within 150ms after local UI action.
- Live validated text p50 under 2s and p95 under 5s in the target region.
- Total turn deadline 8s, including any single retry/repair. A useful authored step is always available.
- One in-flight turn per session, two model attempts maximum per turn, 1,024 output-token ceiling.
- Retry only transient failures with bounded jitter and remaining deadline. A disconnected/cancelled
  call can still incur provider usage; record this without showing its late result.
- Start with 60 live turns per family per day in pilot; maximum 12 calls per question help episode.
  Reaching a cap switches to prepared teaching, never strands the lesson or silently raises a bill.

Log status, latency, tokens, model/prompt/schema versions and fallback reason, not hidden reasoning.
Use model-reported usage where available, with conservative reserved usage for unknown outcomes.
Phase 0 measures cost per teaching episode using the configured model's current price, without a
hardcoded promise about subscription cost. Add per-family token ceilings before multi-family QA.

### Gemini narration

Show caption immediately after text validation. Request audio separately using the approved step ID;
server loads the accepted text rather than accepting arbitrary client text. Decode the documented
audio format and return a bounded same-origin audio resource. One audio owner stops previous speech
on replay, navigation, pause or a new turn. Device speech and captions remain available on failure.

Cache generic reviewed narration by content hash, voice, pace and model version. Family-specific
narration stays family-scoped and expires within 24h; use bounded storage (not unbounded DB blobs).
Use memory with bounded LRU for adult prototype; select durable object storage only if measured reuse
justifies it. Cache eviction cannot break a lesson. No microphone or Gemini Live dependency.

## 6. API, persistence and evidence

Parent QA routes:
- `POST /api/tutoring/sessions`: start content-only fictional preview; parent auth required.
- `POST /api/tutoring/sessions/:id/turns`: submit expected revision and allowed action.
- `GET /api/tutoring/sessions/:id`: resume accepted state.
- `POST /api/tutoring/sessions/:id/end`: end idempotently.
- `GET /api/tutoring/sessions/:id/steps/:stepId/audio`: authorized accepted text narration.

Equivalent child routes under `/api/kid/tutoring/...` use the current child session and existing request
protection, never a submitted kid_id. Adult previews are always `preview` sessions and cannot record
child assessment evidence. Child requests require live setting, family permission and eligible lesson.

Start body: operationId, lesson/content hash, question reference when applicable, mode teach/help.
Turn body: operationId, expectedRevision, currentStepId, action and optional typed response evidence.
Server resolves lesson/task/family from the session. Do not trust client answer keys, permissions,
model names, prompts, token limits or mastery. Return 409 for stale revisions with resumable state.
All endpoints have bounded bodies, rate limits and family ownership checks.

Three operational tables, introduced in one new migration using the next available migration number:
- `tutoring_sessions`: family_id, actor user/kid scope, preview flag, lesson/content hashes, mode,
  status, revision, current accepted state, timestamps and expires_at.
- `tutoring_turns`: family/session IDs, operation_id, request fingerprint, expected revision, status,
  accepted step or fallback, model/prompt/schema versions, usage, latency and timestamps.
- `tutoring_usage`: family_id, period_start, period_kind (day/month), operation class (text/audio),
  reserved/consumed tokens, calls and timestamps; unique family/period/class key. Contains no prose.

Forced RLS on all three; rows typed from schema, queries through withFamily. Reserve a pending turn in a
short transaction, release transaction before provider I/O, then compare-and-swap session revision
in a second transaction. Unique session/operation constraints deduplicate repeats; different payload
under the same operation ID is rejected. A pending lease expires after 30s. Repeated requests return
pending/result without launching duplicate calls. Crash/lease recovery falls back rather than blindly
reissuing an uncertain billed operation. Permission and revision rechecked before accepting output.
Family rate/budget reservation must be transactional across processes, not an in-memory counter.

Retention defaults for pilot: sessions, accepted turn text and bounded input evidence expire after
7 days. Do not store full prompts or raw audio in the evidence stream. Daily cleanup handles session
and turn rows; family deletion removes them; purged sessions return a clean restart state. Keep only
minimal aggregate usage needed for the current monthly cap after purging turn content.
Purge usage periods after 62 days. Defaults: 2 million input and 200,000 output text tokens per family
per month, plus 100,000 narration characters. These pilot ceilings bound consumption, not guaranteed
currency spend; deployment also sets a monetary ceiling using versioned model pricing. Reserve the
worst allowed request cost before I/O and settle actual usage; unknown outcomes retain the reservation.

Extend existing append-only events with `teaching-shown`, `teaching-responded`, `teaching-ended`.
Record lesson/question reference, teaching material/version, assistance and step outcome. Publish
server-originated Gemini-step references only after acceptance; child shown acknowledgments use
idempotent event IDs. Keep diagnostic/practice responses separate from independent assessment.
Progress folding must not count watching/replaying an explanation or assisted completion as mastery.
No new parent reporting UI in this slice; existing handoff remains, evidence supports a later summary.

## 7. Teaching content implementation

Each initial skill slice needs: one concept introduction, two representations, two diagnostic checks,
one worked example, two partial-completion steps, one prerequisite bridge, three fresh transfer items,
and a short recap. Reuse verified question variants and art; do not create unproved live exercises.

Addition: ten frame and number line; diagnose completing ten versus counting on.
Reading: word/meaning in a short passage; diagnose decoding versus understanding using existing
checked interactions. Do not promise oral-reading assessment without microphone support.
Food chains: arrow direction and a missing link; demonstrate energy/food passing through the existing
plant/animal scene using age-appropriate reviewed wording.

Introduce an optional pack teaching field with a schema version and content hash. Older readers ignore
it; new readers validate it before use. Existing packs remain readable. Extend notation only with the
minimum lesson-to-teaching reference; keep sequences in a validated data format until authoring needs
justify richer syntax. Add manifest/reachability tests so unreferenced drafts never ship to children.

Bridge selection uses explicit skill links, not global model guesses or a full curriculum prompt.
Worked examples and independent transfer items must differ in instantiated values. For ungradable
creative responses, teach process and retain parent assessment; no model correctness verdict.

## 8. Authoring and evaluation workflow

Add an adult command to draft teaching material from a selected lesson/skill through Gemini. Output
stays in a review artifact outside the shipped content loader. Validate references and mathematics,
render desktop/phone previews, and record an adult acceptance before copying to curriculum content.
A rejected draft can be repaired once per command with validator messages. No automatic publishing.

Initial evaluation suite: 60 fictional cases across the three slices, divided among correct work,
recognised mistakes, ambiguous mistakes, repeated confusion, prerequisite gaps and malicious/irrelevant
input. Run each case three times with recorded model/prompt versions. Include content mismatches,
unknown anchors, unavailable audio and provider failures in deterministic tests.

Compare authored baseline and Gemini with identical UI/material. Human rubric: factual accuracy,
age-appropriate wording, helpful next step, non-repetitive support and honest uncertainty. Block release
on any severe unsafe instruction, accepted invalid action or false numerical claim in the reviewed set.
Target at least 90% acceptable next moves and 100% valid rendered actions on that suite. These are
prototype acceptance targets, not a guarantee of future model output or measured learning gains.

A later supervised pilot measures independent transfer on fresh tasks, delayed retention, requests for
adult help and time spent waiting. No unsupervised experiment or automated scoring of the child's
emotional state. Manual QA scripts include entering from the map, returning to the same answer,
changing tutor, interrupted speech, reconnecting, stale tabs and reloading mid-help.

## 9. Execution phases and acceptance gates

| Phase | Deliverable | Required acceptance |
|---|---|---|
| 0. Contracts and Gemini smoke test | Update policy docs, versioned types, env configuration, synthetic JSON/TTS calls | Credentials remain server-only; configured models work; measured sample latency/usage; clear missing-key failure |
| 1. Materials and pure runtime | Three reviewed bundles, reducer, allowed actions, local planner | Reference/checker tests; pause/restore/stale-result tests; all three teach offline |
| 2. Real UI scratchpad | Compact and expanded board, guides, captions, device speech | Desktop/tablet/phone and keyboard QA; preserved answers and aspect ratios; same components intended for app |
| 3. Gemini adaptive tutoring | Server turns, schema validator, retry/fallback, evaluation runner | Fictional evaluation suite and fault tests pass; complete live prototype, not scripted responses |
| 4. Durable sessions and Gemini speech | RLS tables, idempotency, budgets, accepted-text audio, retention cleanup | Cross-family, duplicate, concurrent, revocation and restart tests; no duplicate event credit; bounded audio cache |
| 5. Parent integration | Parent QA entry and settings/preview; lesson links behind flag | Adults can test whole flow without modifying child progress; controls and integration review |
| 6. Child integration held off | Kid routes, lesson help/Teach me entry, evidence folding, unsupported-lesson fallback | Kid build guard, auth/isolation and browser tests; full check passes; manual QA package prepared |
| 7. Controlled child rollout | Enable selected families/slices after launch dependencies resolved | Product/provider/data review and parent opt-in; rollback exercised; supervised pilot plan agreed |

Dependencies: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. UI and adapter work can proceed independently after
contracts, but no agent delegation is assumed by this plan. The main integration owner controls shared
pack, event, schema, route and boundary edits to avoid incompatible contracts.

Required checks: type/lint/format/boundaries; compiled content checks; reducer and selection tests;
Gemini parsing and fault tests; DB/auth integration; desktop/phone browser tests; child build guard;
full `npm run check`. Live paid evaluations are an explicit command, not ordinary CI. Mock providers
exercise normal CI without keys; fixed fixture output is never represented as live-model validation.

Rollback: server global off switch returns authored steps; child feature flag restores existing help;
keep the current lesson/answers intact. Additive migration and optional pack fields need no destructive
rollback. Model changes require smoke test and evaluation; no automatic promotion to a new model.

## 10. Definition of done and deferred work

Done for approval scope: three complete teaching slices, real Gemini adaptation and narration, shared
runtime and renderer, parent QA access, child integration behind disabled rollout flag, tested recording,
offline fallback, bounds and restoration, with a manual QA guide and actual evaluation report.

Not silently included: all-curriculum automatic publication, microphone transcription, Gemini Live
conversation, generated avatar videos, free browsing, model assessment of essays/art, or a separate
parent analytics dashboard. Future speech input will feed the same typed intent/evidence path and
needs its own input permissions and tests. None is required for the designed tutoring experience.

Remaining external inputs: usable API credentials and model access for phase 0; deployment provider
eligibility for phase 7. All product/technical defaults needed to begin are specified above. Once
approved, routine implementation choices can proceed without repeating approval at every phase.

## Technical references

Checked 25 September 2026; revalidate exact model access and request capabilities in phase 0.
- [Gemini models](https://ai.google.dev/gemini-api/docs/models): model IDs are configuration, not UI.
- [Text generation](https://ai.google.dev/gemini-api/docs/text-generation): server transport, API-key
  header and stateless interaction support.
- [Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output): constrained response
  shape, supplemented by local semantic/reference validation.
- [Speech generation](https://ai.google.dev/gemini-api/docs/speech-generation): separate narration
  operation with explicit voice selection and validated transcript.
