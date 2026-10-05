# The companion

A child's lesson has one kind of help: Charlie, who reads the lesson's explanation and walks a
question's help aloud, one step at a time. She is drawn from our own figure kit and read in one of
Gemini's voices. Each line is voiced the first time any child needs it and kept for everyone after,
so the help costs almost nothing per child. It replaced the world's guide card and the "A hint"
buttons on every question; a lesson's hints stay in its file and in the pack, and the companion is
the only way a child sees one.

We first built the companion on Tavus's conversational video: a live call with a cartoon face, and
later clips of that face recorded once. A live minute cost about $0.32 to $0.37, which came to about
$64 per active child a month, and the clips about $750 once. Most help is the same for every child,
so we removed both and kept the voice. The git history has the call and the clips.

## What the child sees

Every sheet a child is doing has a round speech-bubble button in its heading's corner, Explain this
lesson, and the question to do now has a round help button, Help with this one. A grown-up gets the
same on every lesson shown on their pages, recording nothing; the site's sample sheets never offer it.

- Explain this lesson reads the lesson's explanation: its title, what it is for and what it tells the
  child, in the lesson's own words, then how to go on.
- Help with this one climbs the question's ladder ([hint-steps.md](hint-steps.md)), one rung a tap
  or a Next: each hint, read aloud and opened on the sheet, with the part the question turns on
  ringed; then the lesson's worked example of the same item, drawn beside the question; then a walk
  through to the answer. Help after that says every step has been given.

The walk to the answer reads every hint in order, the answer in words where the author wrote them,
and the answer, and is recorded as `help-asked` with `answer`, so the log shows the answer was given.
Nothing reads that yet: progress counts an answer checked after it as it counts any other.

The dock is Charlie's head and shoulders in a small round frame beside the lesson, level with the
button that asked, with what she says in a bubble and three icon buttons under it: the next step,
say it again, and close. While her voice plays, her mouth opens and shuts with its loudness, which
an analyser on the page measures frame by frame; the figure kit draws her with an optional `talking`
mouth, so the dock only swaps two drawings of her. Under reduced motion her mouth stays still. The
dock can be dragged by Charlie, is drawn inside the dialog the lesson was asked from so a modal does
not cover it, never takes focus from the sheet and does not print.

## What she says, and her voice

`server/companion.ts` builds every line from the pack: `explainScript`, a hint by its rung,
`answerScript`, and the fixed step lines in `LINES` (`school/lessons.ts`), which `npm run check:voice`
checks. A page sends only which lesson and question; it can never have words of its own voiced.

The voice is `COMPANION_VOICE` (Leda until chosen by ear) with Gemini's speech model, through
`speech` in `server/gemini-tutoring.ts`. That model reads a style instruction aloud rather than
following it, so the voice alone carries the tone. A line takes two or three seconds the first time
and is kept under `.cache/companion-voice`, or where `COMPANION_VOICE_DIR` says, named by a hash of
the voice, the model and the words. The words show at once and the voice follows. Without a Gemini
key, the steps show the words alone.

## How it is built

- `server/companion.ts`: the words and the voice cache, behind `GET /api/kid/:kid/companion`,
  `POST .../step` and `GET .../voice/:key`, and the same under `/api/companion` for a parent
  (`server/http.ts`). A child's routes need the family's consent for that child.
- `engine/ui/companion.ts`: the ladder (`rungOf`), the steps, and the `Desk` each question registers
  with what the companion can do on it.
- `engine/ui/companion-dock.tsx`: the dock and Charlie's talking. The child's app and the grown-ups'
  app each draw it and hand it their own routes (`apps/kids/child.tsx`, `apps/home/companion.ts`).
- `engine/ui/lesson.tsx`: the two buttons, and each question's desk.
- `engine/parts/people/figure.ts` and `charlie.ts`: the `talking` mouth.

The child's and the grown-ups' pages allow media from blobs, for the voice (`server/static.ts`); no
page asks for the camera or the microphone. The companion is off in the mobile app
([mobile.md](mobile.md)).

## Not decided yet

- The hints themselves: many are short prompts written to be read on paper. The walk to the answer
  joins them, so it is only as clear as they are; hints written to be heard are the next step.
- Where the voice cache lives in production: it needs a persistent disk on the Render service, or it
  is made again after each deploy.
- The voice, picked by ear from Gemini's.
