# Tutoring QA

Implementation in progress, 25 September 2026. Do not interpret this page as a release sign-off.

Open **Explore → Try the teaching preview**, or `/tutoring`, in a parent account. Choose a lesson,
guide and reading preference, then start. The board uses the same renderer/controller as child help.
The root development server also serves `/.scratchpad/tutoring.html`, a signed-out prepared-only preview.

Supported slices: making ten/adding to twenty, reading clues/finding an answer, and food chains.
The board is teaching practice. Its checks never award worksheet correctness, stars or completion.
Question help records the existing `help-asked` event with material `teaching`; operational tutor
sessions and turns are stored separately and included in family export/deletion.

## Manual pass

Walked at 1440, 1024 and 390 on 25 September, and again after the board was rebuilt that evening:
all three slices reach their recap, a reload resumes the open lesson, the guide and the device voice
change, a repeated turn adds nothing and a second family reads nothing. Pictures are in
`.scratchpad/leftover/tutoring/pics/` and, for the rebuilt board, `.scratchpad/leftover/board/pics/`.

The board shows one thing to do at a time. On a step that invites a touch, the guide's line is the
only instruction, the picture answers a finger, and the one control is "I am ready", which is always
available however much or little has been moved. On the check that follows, the picture rests, the
guide's line becomes the question, and the choices are the only thing to press. The title, the step
marker and the way out sit along the card's top, the action and one quiet line along its foot, and
nothing sits outside the card. On the child's side the board opens in a dialog whose corner close is
the one way out. What a person checks:

- Complete each slice correctly. Check the demonstration and independent questions make sense.
- On a counters step, move fewer counters than the frame needs, then press "I am ready": the check
  still opens. The counters a step does not need yet wait after a gap until they matter.
- Open "I need something else": another way, a grown-up, a pause and the board's size are there, and
  leaving is not, because "Back to work" stays in the card's corner.
- Give wrong answers, try another representation, take the prerequisite bridge, and ask a grown-up.
- Shrink/reopen, pause/resume and return to work; unfinished worksheet inputs should stay intact.
- Change guide and voice, replay, pause mid-speech, leave the page, and switch tabs.
- Test mouse, touch and keyboard at desktop, tablet and phone widths.
- Reload during a session. Retry during a connection failure. No duplicate turn should appear.
- Check a second parent/family cannot read the first parent's session.
- Check unsupported lessons and disabled child tutoring retain the existing guide.

## Provider validation

No usable Gemini key was found in the process environment or repository environment files during this
implementation. No real-model accuracy, narration transcript, or latency result is claimed yet.
Set `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) in the server process, set `TUTORING_ENABLED=1`, and restart it.
The model names are configurable; availability must be verified with that project's credentials.
Never expose these variables through Vite.

```
node --import ./tools/scripts/resolve.ts tools/scripts/tutoring-evaluate.ts --smoke
node --import ./tools/scripts/resolve.ts tools/scripts/tutoring-evaluate.ts --live
node --import ./tools/scripts/resolve.ts tools/scripts/tutoring-draft.ts making-ten /tmp/teaching-draft.json
```

Reports go to `/tmp/lumischool-tutoring-evaluation` unless `TUTOR_REPORT_DIR` names another location.
Review every generated caption and listen to narration before enabling children. Schema/reference
checks do not prove natural-language factual correctness. Independent checks retain authored wording.

## Operations

`TUTORING_ENABLED=0` stops live generation; prepared lessons remain usable. `TUTORING_CHILD_ENABLED=0`
blocks child tutor routes even if a parent saved preferences. Parent QA does not change child progress.
The child requires both the global flag and saved parent preferences, current consent and a valid child
credential. Keep that flag off during parent QA.

The text provider gets a 3.5-second deadline including one bounded retry; prepared text is the fallback.
Speech is requested only for a stored accepted line, bounded to 45 seconds. Replay audio is family
scoped, capped at 16 in-memory entries and expires after 15 minutes. Device speech is the fallback.

Quota reservations are deliberately conservative: 60 adaptive calls/day/family, 2M input and 200K
output token reservations/month, and 100K narrated characters/month. Actual token usage is stored on
turns. Reservations include retry headroom and are not refunded; these are operational token limits,
not a guaranteed currency budget. Model pricing changes require operational review.

The compiled teaching material is read when the API starts, so a content edit needs a restart before
the board shows it; a session whose material changed is retired by the content hash rather than mixed.

Sessions expire after 30 days; deleting a child or family cascades. Schedule daily:
`node --import ./tools/scripts/resolve.ts server/tutoring-cleanup.ts`.
New sessions also clean expired data in their family. The daily job must be scheduled in deployment;
adding the script does not install a scheduler.
