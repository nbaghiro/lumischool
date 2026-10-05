# Hint steps: the ladder a question's help climbs

Part A is built: Help with this one climbs the hints a question already has, then its worked
example, then a walk to its answer, each read aloud by Charlie ([companion.md](companion.md)).
Part B, hints written to be heard, and Part C, checks on hints, are planned and not yet built.

## Why

Most of what a stuck child needs is already written: every item has hints, the scene knows which
part a question turns on, and most lessons have a worked example. The steps walk the child through
those, one small turn at a time, and cost nothing per child beyond a voice made once per line.

The adaptive tutor in `school/adaptive.ts` is a tier up and is not part of this plan. It picks the
next move with a text model and can only use numbers we compute; the checks in part C are what
would let it work on every question rather than the three maths skills it has now.

## Numbers

Hints are written once per item and filled in for each variant.

| | Items | Hints |
|---|---|---|
| Kindergarten and grade 1, maths | 184 | 286 |
| Kindergarten and grade 1, other subjects | 915 | 1,468 |
| Grades 2 and 3, maths | 216 | 392 |
| Grades 2 and 3, other subjects | 1,221 | 2,256 |
| Grades 4 to 6, maths | 515 | 1,002 |
| Grades 4 to 6, other subjects | 2,529 | 4,995 |
| All | 5,580 | 10,399 |

## Part A: the ladder (built)

- The ladder is `rungOf` in `engine/ui/companion.ts`, tested in `engine/ui/__tests__/companion.test.ts`:
  each Help or Next opens the next hint and rings the part the question turns on, then draws the
  worked example where the lesson has one, then walks to the answer, and Help past that says every
  step is given. A hint the grown-up's setting holds back until a first try is answered with "Have a
  go first".
- The words of a step come from `stepWords` in `server/companion.ts`, built from the pack, and its
  voice from `stepVoice` (companion.md says how the voice is made and kept).
- The walk to the answer is `answerScript`: "Here is how it works, step by step.", every hint, the
  question's `explain` where it has one, and "So the answer is" with the answer, using the answer's
  labels where it has them.
- Events: a step opens a hint as `hint-opened`, rings as `help-asked` with `where`, draws the worked
  example as `help-asked` with `easier`, and walks to the answer as `help-asked` with `answer`.
- The fixed lines a step says are in `LINES` in `school/lessons.ts`, which `npm run check:voice`
  checks.
- `tools/e2e/lessons/companion-steps.e2e.ts` climbs a question's steps on a grown-up's lesson to the
  answer, with no Gemini key, so it runs in `npm run test:e2e` anywhere.

## Part B: hints written to be heard

Many hints are short prompts written for paper, such as "Count on from the bigger number.", and the
walk to the answer is only as clear as they are. We want each question's hints, read in order, to
take a child to the answer in words a six-year-old follows. The plan:

1. A script has a text model rewrite an item's hints offline, given the item's question, its
   values, its answer expression and the lesson's say blocks, as two to four hints that each name a
   step the child can take, the last one close to the answer without saying it.
2. Each rewrite is compiled, so the verifier fills it in for every variant as it does now, and
   `npm run check:voice` checks its words; what fails is dropped and kept as it was.
3. The script writes what passes into the notation, in waves: kindergarten and grade 1 maths first
   (286 hints), then the rest of maths, then the other subjects. No person reviews each one.
4. Voices made before for a rewritten hint are no longer asked for; the cache keeps them until it is
   cleared.

## Part C: checks on hints

1. The notation gains properties on a hint, as `when` has `point`:
   `hint "How many spaces are empty?" check=(10 - n) point=frame`. `check` is an expression over the
   item's values, or `choice(...)` for a word answer; `point` names the part to ring.
2. The verifier works every check out for every variant, as it does the answer, and refuses one
   that cannot be worked out, one that is not a whole number or one of its choices, a `point` the
   scene does not draw, and a check equal to the question's own answer in any variant.
3. The pack gains an optional `steps` beside `hints` on each question, one per hint, with the check's
   value, its choices and its part, so packs made before still read. `readLesson` reads it.
4. The step shows the check: three choices for a number, worked out by our code as `choicesFor` in
   `school/adaptive.ts` does, or the choices the hint names, and marks it.
5. Each answer to a check is recorded as a new event kind, `hint-checked`, with the sitting, the
   question, the hint's rung, what the child chose and whether it was right. It is a child's own work
   (`WORK` in `school/family/access.ts`), appended like any other, and the journal shows it under the
   question.
6. A text model drafts the checks offline as in part B, and the verifier alone gates them.

## Decided

- The step's voice is a cached AI voice, not the device's voice.
- The last step walks to the answer, and that is recorded as `help-asked` with `answer`.
- A child's answers to checks are recorded, as `hint-checked`.
- A text model drafts rewritten hints and checks, and the verifier alone gates them; no person
  reviews each one.
