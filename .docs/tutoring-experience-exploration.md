# Teaching and tutoring experience

Status: proposal for review, 25 September 2026. No product implementation approved by this document.
This reopens the child-facing model and character decisions in [ai.md](ai.md); it does not silently
replace them. The user has requested exploration of adaptive tutoring and whole-lesson teaching.

## Recommendation

Build one teaching runtime with compact question help and an expanded interactive teaching board.
Use reviewed teaching sequences as the dependable foundation. Compare a deterministic planner and
an LLM planner behind the same interface. The desired live model role is to diagnose cautiously,
choose the next instructional move and explain it briefly in context. The engine remains responsible
for numerical truth, scene operations, exercises, permissions, recording and progression.

A selectable illustrated tutor is a presentation layer over this shared system. Teaching must still
work when the character, sound or live service is off. Start with an adult-only scratchpad comparison,
using fictional attempts, before changing children's lessons.

## What exists today

Audit of the working tree on 25 September, not a deployed-production inventory:

- `engine/ui/tutor.tsx`: illustrated Guide, poses, pointing, read-aloud and a card of lines/actions.
- `engine/ui/lesson.tsx`: Help opens the first unopened hint; Show me advances the hint ladder;
  Where highlights a scene reference; Easier first displays the available alternative; Ask a grown-up
  pins the question. Controls depend on available content and settings.
- `school/lessons.ts`, `easierOf`: only a worked example of the same item in the same lesson, or that
  item at the lesson's easy level. It cannot follow a prerequisite to another lesson.
- `apps/kids/lesson.tsx`: answers and help events are recorded within a sitting.
- `engine/pack.ts`: scenes, prose, worked examples, feedback conditions, hints and practice variants
  already travel in lesson packs. This is useful teaching material, but not an interactive teaching script.
- Source scan: 2,258 item files. Hint counts per file: 65 have zero, 343 one, 1,832 two, 18 three.
  1,004 files have no `when` declaration. This is a textual inventory, not proof that those items
  lack all feedback: answer mechanisms and parent-marked work differ.
- 225 of 336 lesson files contain a `worked` declaration. This does not imply every question or level
  has a matching worked example. Source-level coverage differs from compiled and reachable coverage.
- Lessons already contain conceptual exposition. For example `nature-13-food-chains.lumi` has a
  picture, explanation, practice, challenge and recap. We should adapt this material, not regenerate
  every lesson from a title.
- `.scratchpad/src/pages/assistant.ts` uses a scripted chooser/writer. It is not evidence of live
  tutoring quality. Its original content-only choice architecture is narrower than this proposal.
- `server/gemini.ts` supports feedback-authoring requests with JSON responses. Search found the helper
  and tests, but no production caller. It is not a child tutoring endpoint.
- `school/assistant/envelope.ts` admits only authoring content and verifier problems; child records,
  answers, audio and identifying fields are explicitly excluded. A tutoring envelope needs a separate,
  reviewed contract rather than widening this one accidentally.
- No configured Gemini/Google API key was found in the root `.env*` files or matching process variables.
  `.env.example` documents `GEMINI_API_KEY` and `GEMINI_MODEL`. No model experiment was run.

The dated 132-item, one-hint inventory in ai.md is obsolete. The remaining limitation is the help's
reach, its instructional depth and its response to the child's misunderstanding, not simply hint count.

## Options to compare

| Approach | Child experience | Strength | Limitation | Decision |
|---|---|---|---|---|
| A. Rich authored teaching | Visual lessons and branching help prepared in advance | Reliable, immediate, offline; easy to inspect | Authoring effort; unfamiliar misunderstandings fall outside branches | Foundation and comparison baseline |
| B. Grounded adaptive tutor | Model chooses an instructional move and supplies brief explanation around controlled scenes | Flexible rephrasing and diagnosis; can connect prerequisites | Live latency, uncertain explanations, provider and data requirements | Preferred target, gated by measured benefit |
| C. Voice-first character classroom | Child talks with a tutor that presents a whole lesson | Natural questions and spoken practice; strong sense of guidance | Recognition errors, interruptions, noise, cost and more complex data handling | Later interaction layer, not first architecture |
| D. Generated lecture/video | Tutor presents a prepared narrated lesson | Consistent delivery; reusable explanations | Mostly passive; costly to revise; weak recovery when a child misunderstands | Short reusable segments only |

A and B must use the same board and lesson material so a comparison tests adaptation, not visual polish.
B is more than an LLM choosing the existing two hints. It can choose diagnostic questions, switch
representations, select a prerequisite bridge, or produce a shorter grounded explanation. It must
not generate arbitrary runnable UI or redefine the correct answer.

## Proposed experience

### At lesson entry

Offer a compact Teach me entry alongside starting the work; a parent preference can make guided
teaching the default. Confident children may skip, replay or return later. Keep the existing worksheet
and print path. The map should open the same lesson identity whether teaching or practice comes first.

An expanded board uses the app's paper, art shelf, palette and typography. The diagram occupies most
of the space; the tutor sits at its edge. Controls are pause/replay, sound and back to work, with one
contextual action or answer area. Avoid a chat column, stage curtain, fake video call or busy dashboard.
Use available viewport space without stretching art. On phones use a legible scene above the response
area, rather than shrinking a desktop composition. Expansion is in-app, not mandatory browser fullscreen.

A proposed lesson sequence is Notice → Show → Together → Your turn → Remember. These are internal
phases, not five permanent tabs. The tutor asks the child to do something regularly: place, predict,
select, draw, listen or explain. Segment lengths and frequency of interruptions need child testing;
short scenes are a hypothesis, not a proven universal timing rule.

### When a question is difficult

Help begins beside the existing question, preserving the answer and scroll position. Show one short
instruction and one meaningful action. Initial choices can be Show me and Another way, with read-aloud
and expansion available. Additional controls appear only when needed.

The teaching policy can choose:
1. Clarify the task or a word in it.
2. Ask one diagnostic micro-question, rather than infer a misconception from a single wrong answer.
3. Demonstrate a different example with the same skill.
4. Let the child complete one missing step.
5. Teach a prerequisite in a short detour, then return to the original question.
6. Offer adult help or a break when further prompting is unproductive.

Do not repeat the same hint with cosmetic rewording. Do not withhold a worked explanation forever
in the name of being Socratic. If the original answer is revealed, record that help and check understanding
with a fresh problem. A supported completion is not evidence of independent mastery.

Example: a child answers 8 + 5 with 12. First ask them to move enough counters to complete a ten frame.
If they cannot identify the two spaces, teach that prerequisite. If they can, group the two, leave three,
and invite them to complete the addition. Return to 8 + 5, then offer a new independently checked sum.
The misconception is a hypothesis until the child acts, not a diagnosis stated as fact.

For food chains, use the existing seaweed/crab/gull art and animate one arrow. Ask the child to select
who receives the food. For reading, provide a word/phoneme demonstration and meaningful comprehension
choice. For writing and art, scaffold planning and observation while preserving parent marking.
One shared runtime must not force every subject into numeric right/wrong evaluation.

### Tutor choice

Parents choose from a small set of existing illustrated guides, previewing the same explanation with
each. Offer a neutral/no-character choice, voice on/off and pace. Keep appearance, voice and instructional
policy separate: choosing an owl must not make a lesson harder than choosing a bird.

A light fictional teacher identity can make the experience memorable. Start with visual expression,
clear pointing and consistent delivery, not elaborate biographies or relationship mechanics. A later
name or speaking style would explicitly revise the current no-persona rule. Never pretend the tutor is
a human, shame a mistake, reward dependence or claim emotional attachment.

### Parent experience

Per-child settings distinguish prepared teaching from live adaptive help and, later, microphone use.
Parents can preview any lesson as the child sees it. An eventual summary shows concepts practised,
help used, successful independent follow-up and places requiring an adult. It must not label children
from inferred emotions or equate time spent with learning. Decide retention and visibility before
storing conversation text. No new report surface is required for the first prototype.

## Shared technical design

Proposed modules, not existing APIs:

- `engine/teaching.ts`: DOM-free typed steps and a reducer for presentation, pause, interaction,
  interruption, completion and restoration.
- `engine/ui/teaching.tsx`: one renderer reused inline and expanded, using existing scenes, art,
  answer controls, tutor poses and accessibility primitives.
- `school/tutoring.ts`: skill-specific teaching policy, prerequisite traversal, assistance level and
  selection of reviewed materials. Separate content availability from inferred understanding.
- Pack extension: versioned teaching sequences and stable step/scene anchors; links to skill and
  misconception metadata; prerequisites; worked examples; checks for understanding. Support legacy
  lessons that have no new teaching material. Compile and verify upstream; no notation compiler in kids.
- `server/tutoring.ts`: authenticated, bounded model orchestration through our server, behind feature
  and per-child permission checks. Provider adapter remains replaceable. No API key in a browser.

Turn flow:

Child action → tutoring policy → local material or server proposal → validation → teaching step
→ engine-rendered interaction → existing answer checker → recorded evidence → next step.

The server resolves the actual question and material from trusted identifiers and content hashes.
The client cannot supply a different answer key, child identity or permission. Requests include an
idempotency key and current step revision. A response for an abandoned question is discarded.
Cancel on navigation, pause or a new attempt. Never let a late answer rewrite the child's latest work.

The model proposes a small structure: instructional intent, grounded explanation, material reference,
allowed scene action, optional follow-up reference and stop reason. A step can point at a known
anchor, reveal an approved grouping or play an existing demonstration. It cannot send JavaScript,
HTML, arbitrary SVG, URLs or unbounded scene operations. It cannot write marks, grant mastery, unlock
content or issue unrestricted tools.

Validation layers are distinct:
- Schema and reference checks establish that the response is executable within the supported UI.
- Existing expression/answer machinery validates calculations and parameterised checks.
- Source-linked content and subject review assess explanation fidelity.
- Language checks bound length and suitability; a second model can flag issues but does not prove safety.
- Human evaluation assesses whether the explanation teaches effectively. Schema-valid prose can still
  be false, unhelpful or developmentally inappropriate.

Free prose is especially hard to verify outside arithmetic. Start with tightly grounded reviewed
materials; treat open explanations as the experimental part. Cache reviewed content by skill,
content hash, language and teaching variant. Do not share child-specific transcripts across families.

Use a minimal pedagogical context: current task, verified facts, current response where permitted,
recent assistance and a small prerequisite summary. Removing a name does not automatically make
learning data anonymous. Keep identity and authorization server-side and define provider disclosure,
retention, deletion and family access explicitly. Speech requires its own permission and lifecycle;
do not silently turn on microphone capture when selecting a voice.

Local content answers immediately; a slow/offline/rate-limited/invalid model response falls back to a
real useful lesson step. Bound requests, output tokens, repair attempts and per-family spend. Measure
p50/p95 latency and cost per completed help episode; no cost claim until a model and actual traces
are measured. Stream only validated complete units, not raw model tokens directly to the child.

Record teaching shown, material/version, assistance type, diagnostic response, return to question and
independent follow-up separately from ordinary assessed attempts. Explanations watched are not scores.
Store sufficient decision metadata for debugging without retaining hidden reasoning or defaulting to
permanent raw audio/transcripts. Integrate with the existing append-only family-scoped evidence path.

## Provider feasibility

The Gemini Developer API terms inspected on 25 September 2026 (effective 23 March 2026) prohibit API
clients directed towards or likely to be accessed by under-18s. A server proxy or parental opt-in does
not by itself resolve that restriction. A standard API key is not evidence of permission to launch
this feature. Paid API terms also distinguish no training from no retention.

Separate adult development/content-authoring evaluation from child deployment. Before live child
pilots, confirm a provider/service agreement explicitly suitable for the audience, data and deployment.
Google Cloud services have separate terms, but this research has not established that Vertex AI or
another provider is an approved substitute. Keep the adapter generic while resolving this.

No credentials were printed and no child information was sent to a model during this exploration.

## Prototype and evaluation sequence

1. Build an adult-only scratchpad using real app styling and compiled sample content. Cover addition
   across ten, a reading task and food chains. Provide one fixed example of inline help and the same
   episode expanded onto the teaching board. Use fictional children and attempts.
2. Prepare strong authored teaching sequences and a deterministic baseline. Add the shared typed
   actions, interruption handling, restore and offline fallback before a live provider.
3. Evaluate a model planner using exactly the same material and actions. Compare next-move quality,
   rephrasing, accuracy, latency and repeated failure recovery. Include unknown errors and requests
   for the answer, not just happy-path questions. Persist model/version/prompt versions for reproducibility.
4. Adult reviewers compare at least three experiences: authored interactive teaching, adaptive board,
   and a voice-led version. Check keyboard, touch, captions, no sound, reduced motion and narrow screens.
5. After product/provider/data decisions, run a small parent-supervised child pilot. Compare independent
   performance on a fresh related task and later retention, not only completion, smiles or chat length.
6. Integrate the winning experience behind parent controls in existing lessons; expand by skill family
   once content coverage and evaluation support it. Open speech and long-form subject exploration later.

Proposed release criteria: no invalid engine actions accepted; no model-granted credit; no loss of work
on interruption; appropriate explanations across a reviewed error suite; useful fallback; demonstrable
independent follow-up benefit over the strong authored baseline; acceptable measured latency/cost.
Numeric quality targets should be agreed after baseline measurement. Passing a finite test set cannot
prove all future natural-language output correct.

Decisions for the next review:
- Adopt the shared interactive board as the target and compare A versus B there?
- Permit grounded child-visible model prose in a future live pilot, explicitly revising ai.md?
- Use visual tutor choice first, with microphone and richer personas later?
- Choose a child-deployment provider only after its audience/data terms are established?

## Research and interpretation

These sources inform the proposal; none establishes that our planned implementation is effective.

- [EEF: worked examples](https://educationendowmentfoundation.org.uk/news/supporting-pupils-with-worked-examples):
  supports modelling and scaffolded practice. Our proposed transition from demonstration to partial
  completion to independent work is a product interpretation of that guidance.
- [Khan Academy: recent tutoring tests](https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/):
  reports benefits from recent-performance context and prerequisite review, and tracks next-item
  correctness, latency and engagement. We should test these ideas here, not assume its results transfer
  to Lumischool's ages, curriculum or interface.
- [Khan Academy: parent history](https://support.khanacademy.org/hc/en-us/articles/14394854880909-How-do-I-view-my-child-s-Khanmigo-chat-history):
  an example of parent visibility. A full transcript is available there; our summary-versus-transcript
  design and retention need their own decision.
- [Duolingo: Video Call](https://blog.duolingo.com/video-call/): illustrates character-led, short spoken
  practice. Its conversation-first format is more directly relevant to language practice than to a
  five-year-old learning arithmetic. It is inspiration, not a template for all subjects.
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output): a schema can
  structure proposals, but it does not establish the truth or instructional quality of their content.
- [Gemini API terms](https://ai.google.dev/gemini-api/terms): source of the provider constraint above.
