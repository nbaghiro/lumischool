# The companion

A child's lesson has one kind of help: a cartoon companion on a live video call, which explains the
lesson or helps with the question the child is on. It replaced the world's guide card and the
"A hint" buttons on every question, in every world. A lesson's hints stay in its file and in the
pack, and the companion is now the only way a child sees one.

## What the child sees

Every sheet a child is doing has "Explain this lesson" under its goal, and the question to do now
has "Help with this one" at the end of its row. Nothing else on the sheet asks for help.

A grown-up gets the same companion wherever a lesson is shown on their pages, so they can try it.
The lesson overlay from Explore, the map and the calendar has "Explain this lesson" under the goal
and "Help with this one" under every question; a finished day in the journal has "Explain this
lesson" only. On a sheet being looked at,
the hints it opens, the part it rings and the worked example it draws are shown on the sheet and
recorded nowhere. The site's sample sheets never offer it.

Starting a call opens the chooser, with three faces: Dr. Paws, Mr. Edward and Mrs. Hart.
The face chosen last is marked, and tapping a face starts the call. The choice is kept as the
`companion` setting in the family's log, so it follows the child to another device. "Talk to someone else" under the name ends the call and opens the chooser again; the face picked
then carries on from the same question, as a new call that counts against the day.

The call joins straight from the page, with the camera never on and the microphone off. The
companion speaks first, about the button the child tapped, so a child never has to talk to start.
The dock is the character's own video in a small tile at the top right of the window, with a bar of
icon buttons under it: hold to talk, say it again, show the words, talk to someone else and close.
The words it says are hidden until asked for. It can be dragged anywhere by the video, it is drawn
inside the dialog the lesson was asked from so a modal does not cover it, and the call ends when
that dialog closes. It never takes focus from the sheet, it does not print, and under reduced motion
it shows the face's still with the voice only.

The companion points at the sheet through three tools, each done the way a press would do it and
recorded the same way:

- `show_hint` opens the question's next hint, as `hint-opened`, subject to the grown-up's hint setting.
- `ring_part` rings a part of the question's picture for twelve seconds, as `help-asked` with `where`.
- `show_worked` draws the lesson's worked example of the same item beside the question, or the same
  item at the easy level, as `help-asked` with `easier`.

Starting a call on a question records `help-asked` with `talk` and the face, so the log shows which
answers came after a talk. Nothing reads that yet: progress still counts those answers as it counts
any other. When the child checks an answer on the question being
discussed, the companion is told whether it was right and what the worksheet said. When the sheet
moves on to the next question, the companion is told where the child is now.

## What the companion knows

The server builds everything the companion is told from the pack, from the lesson id, level and
question number the page sends (`server/companion.ts`). It gets the lesson's title, subject, grade
and goal, the lesson's own say blocks, and for the question: its words, how it is answered, the ids
of the picture's parts it may ring, the hints already open, how many more there are, whether a
worked example exists, how many answers were checked and the worksheet's last reply. It is never
told an answer, an `explain` line, an unopened hint, a dictation's sentence or the notes for
grown-ups. The worked example's own answer reaches it only once the example is on the screen.

Within a call the companion remembers the whole talk. So that it also remembers across calls (one
that ends after a quiet minute or at its time limit, or another face), the page keeps the last lines
said by the companion and the child in memory, and a new call is told up to twenty of them. They are
never stored: they go when the page closes or another child's page opens.

The child's name and anything else about the child are never sent. No transcript is kept by us.

## Limits and cost

A call ends after thirty minutes, after a minute in which nobody speaks and nothing is pressed, when
the child closes it, leaves the world or leaves the page. A family may start twelve calls a day,
counted in `tutoring_usage` under the period `companion:<day>`; the thirteenth gets a line saying that
is all the talking for today. The companion is offered only when the server has `TAVUS_API_KEY`.

## How it is built

- `server/companion.ts`: the routes `GET /api/kid/:kid/companion` and `POST .../start`,
  `.../context` and `.../end`, the same four under `/api/companion` for a parent, the prompt, the PAL per face and the tools, made once on the Tavus
  account and found again by name.
- `engine/ui/companion.ts`: the call (Daily's call object, loaded on the first call), the messages
  to and from Tavus, and the `Desk` each open question registers with what the companion can do on it.
- `engine/ui/companion-dock.tsx`: the chooser and the dock. The child's app and the grown-ups' app
  each draw it and hand it their own routes (`apps/kids/child.tsx`, `apps/home/companion.ts`), so a
  child's build names none of a grown-up's.
- `engine/ui/lesson.tsx`: the two buttons, and each question's desk.

The child's and the grown-ups' pages allow Daily's script from `c.daily.co` and its connections to
`*.daily.co`, and ask for the microphone; the site's pages do not (`server/static.ts`).

## Not decided yet

- The faces are Tavus's stock faces. A face of our own needs a paid plan.
- We have not measured how long a call takes to start on a phone, or what a day's calls cost.
- The companion speaks English only, including on a language lesson.
