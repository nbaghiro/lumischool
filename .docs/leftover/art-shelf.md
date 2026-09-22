# Art shelf: what is left

## 1. Status and date

The art shelf stream moves every drawing on lumischool's shelf out of the scratchpad
(`.scratchpad/src/art/`) into `engine/parts/`, one family folder per shelf, each drawing rewritten
onto the drawing contract (`engine/parts/drawing.ts`) and the surface (`engine/ink/surface.ts`), so
that the apps can draw without the seam `scratchpad:art` and the scratchpad can be deleted. The plan
is step 3 of "The order from here" in `.docs/structure.md`, decided on 14 September 2026, which also
records every move as it lands. Alongside the moves, the stream owes the catalog balance stream six
new drawings and three new sets of settings that eight of its lessons wait on, and it holds the
coding language in `engine/coding.ts`.

The stream stopped on 17 September 2026 at 11:05 (US Eastern), when the owner paused art shelf work
to focus on the app. The last things landed that day were the scratchpad side of D5 (coding, at
09:02), `ice` and `room` on `wrapped` (10:21) and the lamp world's `flash` block in the coding
language (checks green at 11:04). No move was half done when it stopped: D1 was queued next and had
not started.

On 17 and 18 September 2026 the catalog batch lead installed the staged drawings the catalog waited
on, `magnet`, `ramp`, `falling`, `stringphone`, `raingauge`, `chromatography`, `orbit` and `weave`
(4.2, 4.4 and 4.6 to 4.11), and landed the lamp world's two blocks (4.16); the quick items lead did
4.17, and 4.18 landed as its section says. Each has a line under its batch in section 4. What is left
is the moves (4.1, 4.3 and 4.12 to 4.15) and the unused-drawings cleanup (4.5).

On 18 September 2026 the art shelf lead took the stream up again, one batch at a time with a
checkpoint after each. 4.1 landed that evening, 4.3 and 4.5 on the morning of 19 September, and 4.12
in the small hours of 20 September; their records are under their batches, and sections 2, 3 and 6
are brought up to date as each batch lands.

## 2. Where things stand

The root catalogue, `engine/parts/catalog.ts`, loads 445 drawings since B4 landed on 20 September
2026. There are 482 files in the family folders and in `imported/`; the others are files of
construction on the catalogue suite's `SHARED` list, which `imported/hand.ts` and the generated
`imported/files.ts` joined with this move. The scratchpad's `src/art/` holds 27 files and the
`guides/` folder. Of the nineteen moves the
briefs plan, seventeen have landed in full (B1, B2, B3, B4, B5, B6, C1, C2, C3, C4, C5, C6, C9, D1,
D4, D5, and the four preliminary moves 0.1 to 0.4), along with `engine/coding.ts` and
`engine/pigment.ts`.
No move is half landed.

Four moves have not started: C7 (the games' pieces), C8 (food and the
page), D2 (painting) and D3 (chemistry). E1 (the catalogue changeover) and E2 (the pen copying the
points it hands rough.js) come after all of them. The unused-drawings cleanup the owner decided on
landed on 19 September 2026 (4.5).

Every one of the owner's approved additions has landed: `wrapped` with ice, and `magnet` (chain and
reach), `ramp` (cup, pushed and length, which the coordinator accepted in place of a separate marble
track), the rain gauge, falling things, the string telephone, the chromatography strip, the Earth and
moon from above and the weave grid, installed from the staging folder by the catalog batch lead
(4.2, 4.4 and 4.6 to 4.11).

Three of the sets of settings the catalog waits on (catalog.md batch 6) landed on 17 September 2026,
built by the quick items lead against the catalog lead's specification: `weights` on `stilllife`,
`light` on `layers`, and `rain`, `weight` and `far` on `bridge`. Each defaults to what its drawing
already draws, the two scratchpad drawings keep their catalogue takes in `src/art/catalog.ts`, the
three are recorded in art.md, and their fresh baseline is `parts-move/golden-batch6.json`, with the
files as they were in `backup-batch6-settings/`. The checks were the parts suites 44 of 44, the
scratchpad's catalogue suite, the root's tsc, lint, format check and guards, the golden compares
(every old take equal, every difference a new take), and `check:print` over the four lessons that
draw the three, 4 lessons at 12 levels, each printing exactly its own sheets. The fourth thing that
batch waits on, the weave grid for art-over-and-under, is in the staging folder above and not
installed; the catalog lead installs it with its own next piece.

The last check run, 4.12's at 00:21 to 00:44 on 20 September 2026: the parts suites 50 of 50, the
scratchpad's guards clean and its suites 582 passing with one failing, `check:print` over 52 lessons,
`check:signed-out` on 29 pages and the root check 12 of 14 steps. The three reds in it are other
leads' and are named under 4.12.

## 3. How the work is done

Read `CLAUDE.md` at the root, `.docs/structure.md` (step 3 of "The order from here"), `.docs/shelf.md`
(the bar and the style guide), `.docs/animation.md` (how a drawing declares its motion), and the
briefs' `README.md`, which holds everything every move shares: the contract, the conversion table
from SVG calls to surface calls, the scratchpad adapters (`shelved` in `src/art/catalog.ts`, the
spread in `shelf-groups.ts`, the `MOVED` table in `animation-moved.ts` and the old names in
`moved.ts`), descriptions, the bar, golden hashes and the checks a move must pass.

There are no commits. Every file a step rewrites, moves or deletes is copied first into
`parts-move/backup-<step>/`, keeping its path from the repository root. In a move's scratchpad side,
the importers are repointed first, the scratchpad type check is run with the old file still there,
and only then is the old file deleted.

Heavy checks take the shared locks in `work/CHECKS.md`, which must be read in full first. The check
lock is `work/check.lock` and the browser lock is `work/browser.lock`; each holds a `who` file with
the holder's name, the time and the script's PID. Every heavy step runs under a time limit (twenty
minutes for a suite, the root check, a golden compare or a print run, thirty for playwright), and
nothing starts while the load average is over about twenty. Since 18 September 2026 the batch
scripts share `parts-move/lead-lib.sh`, which follows the recipe in `CHECKS.md` exactly: the check
lock is taken with `mkdir`, the traps are set only after that succeeds, and the release kills the
whole tree under the script and removes the lock only while its `who` line is still ours. The
browser lock is taken innermost, only while the check lock is held and only around the steps that
drive Chrome, as the map lead's scripts take it. A time limit kills the step's whole tree, children
first, since `timeout` alone kills only the command and leaves a Chrome or a worker behind.

A batch runs as one detached script with one log in `parts-move/` (`d1-run.log` for 4.1), and holds
the check lock once for the move and the checkpoint's checks. From the moment its backups are taken
until the move is proven, the script is marked as moving (`MOVING` in `lead-lib.sh`), and any red or
any exit in that window (the edit, either type check, the compare, a kill) runs the batch's
`restore` from the release, which puts back every file it changed and checks each against its
backup, so the tree is never left half moved. A red in the checks after the move is proven leaves
the move in place and is reported, since the move itself draws as it drew.

The art shelf's servers have ports of their own in the 85xx block, recorded in `.docs/local.md`:
8561 for `golden.mjs` and `golden-ab.mjs`, and 8562 for the scratchpad served for the scoped print
and `check:signed-out`, started after the files it checks. A step refuses to start when its port is
taken, and the print also refuses when 9354, the print check's Chrome, is taken, since a check run
against someone else's server passes or fails for the wrong reason. Before printing, the script
asks the served content module whether it holds the file of every lesson it is about to print.

A move lands only when all of these pass:

- the golden compare at the brief's level, with screenshots
- the A/B pixel compare
- the parts suites
- the root check, step by step
- the scratchpad's guards and its suites, one file at a time
- `check:print` over the lessons that draw the move's drawings, on a print server of its own
- `check:signed-out` when the move touches a page

No budget or ratchet may be raised. A red that belongs to another stream is reported with its owner
and does not stop the move.

The full `check:print` no longer fits its twenty minutes (313 lessons were killed at the limit), so
`work/CHECKS.md` now asks a change to print the lessons it touches, and the full print to run in
shards. `parts-move/lessons-for.py <ids>` lists the lesson ids whose scenes or items draw the given
drawing ids. The print must run on a server started after the files it prints, because the shared
dev server on 5173 runs with hot reload off. The batch scripts start the scratchpad's own Vite on
8562 after the move's files are written, record its PID and stop it by that PID.

The tools, all under `/Users/naib/Documents/code/lumischool/.scratchpad/leftover/parts-move/`
unless a path says otherwise:

- `.scratchpad/scripts/golden.mjs write|compare <file> --shots --port <p> --ids ...` renders every
  take of the named drawings on screen and on paper in headless Chrome without the GPU. It records
  hashes of the markup (raw, attributes sorted, ids normalised), the box, the anchors, the
  accessible name, the motion and, with `--shots`, screenshots at question size and as a tile.
- `.scratchpad/scripts/golden-ab.mjs --old <backup files> --ids ... --port <p>` renders every take
  the old way, from the backup of the scratchpad files a move emptied, and the new way, through the
  catalogue, in one page, and compares markup and pixels. It is the tie-breaker when screenshots
  differ with the same markup. The old files may import nothing from `src/` but one another.
- `lead-lib.sh` is sourced by the batch scripts: the locks, the time limit on a step, the server on
  8562 and the question whether it knows each lesson, the scoped print, `check:signed-out`, the
  parts suites, the scratchpad's type check, guards and suites one file at a time, and the root
  check step by step. The runner writes its totals uncoloured (`NO_COLOR=1`), so they can be read.
- `judge.py <compare before> <compare after> <A/B>` says whether a move kept every drawing as it
  drew. A difference counts against the move only if the compare before the move did not already
  show it, and a screenshot that differs with the same markup is settled by the A/B.
- `d1/run.sh`, `d4/run.sh` and `cleanup/run.sh` are batches 4.1, 4.3 and 4.5, each one hold of the
  check lock: a compare before the move, the backups, the prepared edit, the world shelf, both type
  checks around the deletion, the compare and the A/B, then the checkpoint's checks. They replace
  `d1/land2.sh`, `d4/land2.sh`, `cleanup/land.sh` and the `checks.sh` files. Those older scripts
  release a lock without checking it is still theirs, and their A/B could not load `texts.ts` or
  `handdrum.ts`, whose imports of `./moved.ts` and `../sound/hit.ts` do not resolve from
  `scripts/golden/`. The run scripts give the A/B copies of the old files with those imports
  repointed. `make-land2.py` and `make-land.py` wrote the older scripts, and neither should be used.
- The lessons a move prints are in `lessons-now.txt` in the move's folder, recomputed with
  `lessons-for.py` on 18 September 2026: 141 lessons for D1 and 24 for D4.
- `chain.sh` and `print-scope.sh` chained the older land steps and printed on port 5505 under the
  older lock handling. `print_scope` in `lead-lib.sh` takes the print's place, and a batch is one
  run script, so neither is used any more.
- `new/` is the staging folder for the new drawings.
  - `new/engine/` mirrors the root through symlinks, so a staged file resolves the root's modules;
    with `new/tsconfig.json` it type-checks and lints against the root's rules.
  - `new/install.py <name>` puts one staged drawing or change into the tree, with its catalogue
    line, grouping line, shelf entry, old name in `moved.ts` and `MOVED` row. It refuses to
    overwrite a root file that has changed since the copy kept in `new/base/`.
  - `new/make-land.py` writes `new/land-<name>.sh` and `new/checks-<name>.sh`.
  - `new/sheet.sh <out.png> <files>` renders a contact sheet under the browser lock.
  - `new/prove-ice.py` is the physics checker edit that went in with `wrapped`.
- `cleanup/edit.py`, `cleanup/land.sh` and `cleanup/docs.py` are the unused-drawings cleanup.
- `lessons-for.py`, `cleanup-refs.py`, `reaches.mjs` (every catalogued drawing outside its box),
  `analyse.py`, `textcalls.py`, and the survey and inventory scripts (`survey/run.mjs`,
  `briefs-data/inventory.mjs`, `briefs-data/generate.mjs`) are used to prepare a move.

The previous notes are `b3-notes.md` and `c1-notes.md`. The latter holds the converter pattern each
root side used: `convert.py`, then `fix.py`, per move folder, with `homes.json` naming where each
shared helper went.

## 4. What is left, in batches

Batches 1 to 5 must run one after another in this order, since each changes the scratchpad's
catalogue and adapters. Batches 6 to 11 each touch the same shared files and also run one at a time,
but they may be interleaved with 1 to 5. Preparing a root side (batches 12 to 15) can be done at the
same time as any landing, since it writes only new files until its own landing. Batches 16 and 17 do
not depend on the moves and, like any landing, run one at a time.

### 4.1 D1: reading and writing, scratchpad side

The goal is to land the scratchpad side of D1 so the 40 drawings are drawn only from the root.

It touches:
- `.scratchpad/src/art/catalog.ts`, `animation.ts`, `animation-moved.ts`, `shelf-groups.ts` and `moved.ts`
- `src/lang/parts.ts` and `src/lang/scene-render.ts`
- `src/pages/backdrops.ts`, `site-l.ts`, `site.ts`, `music.ts` and `site-sample.ts`
- `src/world/shelf.ts`, which is regenerated

It deletes `phonics.ts`, `texts.ts`, `writing.ts` and `subjects.ts`. It waits on nothing.

Steps:
1. Dry-run `d1/scratch-edit.py` from `.scratchpad/` with `DRY=1`.
2. Run `d1/land2.sh`, then `d1/checks.sh`.
3. Read the compare in `d1/compare-1.txt` at level raw and the A/B in `d1/ab-1.txt`. The baseline is `golden-D1.json`, written on 16 September without the GPU.

It is done when the compare and the A/B are equal, the checks are green or red only for other streams, and `structure.md` step 3 has a sentence after the coding one.

Done on 18 September 2026 by the art shelf lead, with `d1/run.sh` in one hold of the check lock from
23:27 to 23:53 (log `parts-move/d1-run.log`, details in `d1/run/`). The first run, at 22:32, was
stopped by the compare: the alphabet line's three takes, on screen and on paper, differed in their
anchors and in nothing else. D1's converter (`d1/convert.py`, the rename of the helper `letter(` to
`glyph(`) had caught the anchor key inside a template string, so the root's alphabet named its
anchors `glyph(a)` where the scratchpad's named them `letter(a)`. No lesson names those anchors
today, but the notation can place things on them, so the name was put back in
`engine/parts/letters/alphabet.ts` (the file as it was is in `backup-D1/root-4.1/`), and the first
run's edit was restored from its backup before the second run. The second run was equal:

- the compare against `golden-D1.json` at level raw, 208 renders, markup, box and anchors equal at
  208 of 208 and screenshots at 416 of 416. Its six "motion differs" lines (`handwriting`,
  `formletter`, `storymountain`, `treasuremap`, `picsteps` and `expander`) are
  the same before the move and after it: the reason these drawings hold still was reworded after the
  baseline was written ("and a page holds still under the pencil"), not by the move. The accessible
  names the drawings gained on the contract are notes, not differences.
- the A/B, 416 pairs, markup and pixels the same in all 416.
- the parts suites 47 of 47; the scratchpad's tsc, `check-art` and `check-privacy` clean, and its
  45 suites one file at a time, 586 passing and none failing.
- `check:print` over the 141 lessons that draw D1's drawings, on 8562: 141 lessons at 423 levels in
  588 seconds, each printing exactly its own sheets.
- `check:signed-out`, 29 pages, and the root check, 14 of 14 steps.

The same change gave the art shelf's ports 8561 and 8562 their rows in `.docs/local.md`.
`structure.md` step 3 has the sentence. The backups are `backup-D1/.scratchpad/` (the four files and
the twelve that were edited, with `src/world/shelf.ts`) and `backup-D1/root-4.1/` (the alphabet,
`local.md`, `structure.md`, this document and the leftover README as they were).

### 4.2 `magnet` with chain and reach

The goal is to install the staged `magnet` for physics-how-strong-a-magnet.

It touches `engine/parts/science/magnet.ts` and the grouping words in `engine/parts/shelf.ts`.

Steps:
1. Run `new/land-magnet.sh`, then `new/checks-magnet.sh`.
2. The compare against the fresh baseline must show every existing take equal. Its "not in baseline" lines are the four new takes.

The settings are:
- `mode`: things, poles, chain or reach
- `clips`: 1 to 10, the chain
- `clip`: 1 for small, 2 for big
- `reach`: 1 to 10 centimetres
- `tag`: the magnet's letter

The catalog lead asked for `count` for the chain. The drawing uses `clips` so that the things mode keeps its range of six, and the catalog lead must be told. No checker rule is needed, since the items write their answers.

It is done when the checks are green, `physics.md` item 7 records it, and the catalog lead has the settings and the describe text.

Done on 17 September 2026 by the catalog batch lead, before batch 29: `new/land-magnet.sh` then
`new/checks-magnet.sh` in one hold of the shared check lock. The compare was equal on every existing
take, with takes 4 to 7 as the new "not in baseline" lines; the parts suites 44 of 44, root and
scratchpad tsc and lint clean, the root check 14 of 14 steps, the scratchpad suite with none failing,
a scoped print of the 5 lessons that draw `magnet` and `check:signed-out` over 29 pages. The catalog
kept `clips`. `physics.md` item 7 records it (`docs-batch29.py`), and `batch29-notes.md` has the run.

### 4.3 D4: music, scratchpad side

The goal is to land the scratchpad side of D4.

It touches:
- the adapters as in 4.1, and `src/lang/parts.ts`
- `src/sound/piano.ts`, `neck.ts` and `hit.ts` (`hit.ts` defines `DUM` and `TA` again, and they now live in `engine/sound/voices.ts`)
- the nine `src/pages/music*.ts` pages and `src/pages/site-l.ts`
- `test/sound.test.ts`, `strings.test.ts`, `mallets.test.ts` and `compose.test.ts`

It deletes `music.ts`, `strings.ts`, `mallets.ts`, `handdrum.ts`, `tunegrid.ts` and `countrow.ts`.

Steps:
1. Run `d4/land2.sh`, then `d4/checks.sh`. The land step also compares the fretboard, guitar, ukulele and lane at level normal, because their clip ids are now minted per render, and the A/B includes them. The baseline is `golden-D4.json`.

The brief wanted the drawing tests in those four scratchpad test files moved to `engine/parts/music/__tests__/`. The prepared edit only repoints them, so moving them is a follow-up.

It is done when compare, A/B and checks pass and `structure.md` step 3 has its sentence.

Done on 19 September 2026 by the art shelf lead, with `d4/run.sh` in one hold of the check lock from
08:16 to 08:36 (log `parts-move/d4-run.log`, details in `d4/run/`), after three runs that each put
every file back:

- The first run (00:12, `d4-run-1.log`) was red on the scratchpad's tsc before the deletion. The
  root's staff (`engine/parts/music/notes.ts`) declares `meter`, which the scratchpad's had optional,
  and three places in `src/pages/music.ts` and one in `src/pages/site-l.ts` left it out. The staff
  reads a missing meter as 0 (`p.meter ?? 0`), so `scratch-edit.py` now writes `meter: 0` there.
- The second run (00:17, `d4-run-2.log`) was red on the compare and left the tree half moved,
  since `d4/run.sh` still had the old "left in place" line; it was restored by hand from
  `backup-D4`. The fretboard's markup and pixels differed on every take: D1's kind of converter slip,
  where `strings.ts`'s `text(g, ...)` in `fingerDot`, with `g` the finger's own layer, became
  `letter(c, ...)` in `engine/parts/music/fretting.ts`, so a finger number was written outside its
  layer and showed while the layer was hidden (four stacked numbers at every fretted spot). No child
  saw it: the lesson sheets draw through the seam's `scenes`, whose renderer took the scratchpad's
  fretboard until this move. The number goes back into its layer (`letter({ ...c, g }, ...)`), and
  every other converted `text` call in the six files drew into `c.g`, so none needed the same fix.
  Since then every run script sets `MOVING` in `lead-lib.sh`, and any exit before the move is proven
  restores every file and checks each against its backup.
- The third run (08:15, `d4-run-3.log`) was equal and restored itself: `judge.py` held the
  fretboard, the guitar, the ukulele and the lane to raw equality, which cannot hold since their clip
  ids are minted per render. It now holds each compare to the hashes its level names.

The fourth run was equal:

- the compare against `golden-D4.json`: sixteen drawings at level raw, 124 renders, markup, box and
  anchors 124 of 124 and screenshots 248 of 248; the four that clip at level normal, 28 renders,
  ids-normal, box and anchors 28 of 28 and screenshots 56 of 56.
- the A/B, 304 pairs, pixels the same in all 304 (markup the same in 248; the other 56 differ in the
  minted clip ids alone).
- the parts suites 47 of 47; the scratchpad's tsc, `check-art` and `check-privacy` clean, and its
  suites one file at a time 586 passing and none failing, after one fix below.
- `check:print` over the 24 lessons that draw D4's drawings, on 8562: 24 lessons at 72 levels in
  113 seconds, each printing exactly its own sheets.
- `check:signed-out`, 29 pages, and the root check, 14 of 14 steps after one fix below.

Two reds in the checks were this batch's and were fixed after the run, with the files as they were
in `backup-D4/after-4.3/`: the root's format check on `fretting.ts`, where the run's `sed` left the
call on one line that Prettier breaks (formatted with Prettier, nothing else changed), and one case
in `test/strings.test.ts`, which held the lying-down neck's turn to `""` where the root writes no
turn as `undefined` (the assertion now says `undefined`). The format check, `strings.test.ts` (18 of
18) and the parts suites were run again under the lock and are green (`d4-fix.log`).
`structure.md` step 3 has the sentence. The backups are `backup-D4/.scratchpad/` (the six files and
the 22 edited, with `src/world/shelf.ts`) and `backup-D4/root-4.3/` (`fretting.ts` and the documents
as they were).

### 4.4 `ramp` with a cup

The goal is to install the staged `ramp` for physics-energy-on-the-track.

The settings are:
- `length`: the slope's run in squares; 0 keeps twice the height
- `cup`: 0 or 1
- `pushed`: 0 to 12, the mark the cup's mouth stands on, with a dashed outline of where it started

Steps: run `new/land-ramp.sh`, then `new/checks-ramp.sh`.

It is done as in 4.2, with `physics.md` item 2 recording it and the catalog lead told.

Done on 17 September 2026 by the catalog batch lead, in the same session as 4.2: the compare equal on
every existing take with takes 3 to 5 new, the parts suites 47 of 47, root and scratchpad tsc and lint
clean. `physics.md` item 2 records it (`docs-batch29.py`), and `batch29-notes.md` has the run.

### 4.5 The unused-drawings cleanup

The goal is the owner's decision of 16 September. The rocket, the peg board and the crane stay as covers of the removed games. These twelve go, with their catalogue, grouping, animation, bar-suite and shelf lines:
- `marks`
- `landingpad`, `moonground`, `heightmast`, `tubelid`, `balldropper`, `cranehook` and `plank`
- `badge`, `ribbon` and `brace`
- `excalidraw.house`

It touches:
- `.scratchpad/src/art/action.ts`, `furniture.ts`, `catalog.ts`, `shelf-groups.ts`, `animation.ts`, `moved.ts` and `imports.ts`
- `.scratchpad/src/pages/make.ts`
- `engine/parts/catalog.ts`, `shelf.ts` and `__tests__/bar.test.ts`

It deletes `engine/parts/page/marks.ts` and `content/art/excalidraw/house.excalidraw`, and regenerates `engine/parts/imported/files.ts` with `npm run art`.

Steps:
1. Run `cleanup/land.sh`. It writes a baseline of the thirteen drawings that stay in those files, edits, deletes, regenerates and compares.
2. Run a checks script made from `flash/checks.sh`, adding a scoped print only if a lesson draws a dropped id, which `cleanup-refs.py` found none do.
3. Run `cleanup/docs.py`, which updates the survey, the B4, C7 and C8 briefs and `unused.md`.
4. Replace the sentence in `structure.md` step 3 that says none of the 49 unused drawings is dropped before the owner decides.
5. Mark the `ribbon` and `excalidraw.house` bullets in `shelf.md` as dropped.

It is done when the compare is equal and the checks pass. It must run before C7 and C8, whose files it edits.

Done on 19 September 2026 by the art shelf lead, with `cleanup/run.sh` in one hold of the check lock
from 08:41 to 09:00 (log `parts-move/cleanup-run.log`, details in `cleanup/run/`). The first run
(08:40, `cleanup-run-1.log`) was red on the scratchpad's tsc before the deletion and put every file
back: the edit dropped the twelve but left the code only they used, the ground's `crater` and the
brace's `curly`, and three imports in `action.ts` (`RawAnchors`, `numOn, soft` and, once `crater`
was gone, `Marker`). `edit.py` now drops those too (the script as it was is
`edit.py.before-4.5b`). Nothing had picked up any of the twelve, which `shelf-usage.md` had also
measured on 18 September. The second run:

- a fresh baseline of the thirteen drawings that stay in the files it touches (`golden-cleanup.json`),
  and the compare after the edit and the deletions: 68 renders, markup, box and anchors 68 of 68 and
  screenshots 136 of 136, so no A/B was needed.
- the parts suites 47 of 47; the scratchpad's tsc, `check-art` and `check-privacy` clean, and its
  suites one file at a time 586 passing and none failing; `check:signed-out`, 29 pages. No print,
  since no lesson draws a dropped drawing.
- the root check 11 of 14. The three reds are other leads' files, edited while the run went:
  `typecheck` and `lint` on `apps/site/page.tsx` (`CentredRoll` not found, `StillRoll` and
  `TamedRoll` unused; the site lead's work in progress, saved at 09:00) and `typecheck` on
  `school/worlds/trail.ts` (`q` unused) with `format:check` on `school/worlds/trail.ts` and `view.ts`
  (the world canvas lead's, whose `trail.ts` is new on 19 September, saved at 08:57 and 08:58). None
  names a dropped drawing.

`cleanup/docs.py` then updated the survey, the B4, C7 and C8 briefs and `unused.md` (with the date
corrected to 19 September), `structure.md` step 3 says what was dropped, and `shelf.md` marks the
ribbon and the Excalidraw house as dropped. The backups are `backup-cleanup/` (the sixteen files, and
the work folder's records under `parts-move/`) and `backup-cleanup/docs/` (the four documents as
they were). The covers' shelf lines do not yet carry the word `shelf-usage.md` batch 1 asks for, so
that the next usage pass does not raise the rocket, the peg board and the crane as unused again.

### 4.6 to 4.11 The six new drawings, one at a time

The order the catalog lead asked for is below. Each is installed with `new/land-<name>.sh` and `new/checks-<name>.sh`, then recorded in its subject document, and the catalog lead is sent its drawing word, settings and describe text. `stringphone` and `weave` had fixes after their last contact sheet, so render `new/sheet.sh` for them once more before installing.

1. `falling` (science), for physics-air-pushes-back.
   - `things` is a list of up to four from stone, crumpled, leaf, flat, parachute and feather.
   - `time` is 0 to 2, `show` 0 or 1, and `names` 0 or 1.
   - The fixed speeds, fastest first, are in `FALL_SPEEDS` and in the `about` text: stone, crumpled, leaf, flat, parachute, feather.
2. `stringphone` (science), for physics-sound-through-things.
   - `mode` is phone or through, with `taut`, `pinch` and `rings`.
   - `through` is 0 air, 1 a wooden table or 2 a tank of water.
   - The rings are a fixed count, and none are drawn past a pinch or on a slack string.
3. `raingauge` (measuring), for nature-weather-measured.
   - `max`, `step`, `unit` and `show` as usual; `level` goes from 0 to 110 in half steps.
   - A level past `max` fills the tube to `max` and spills over the funnel.
4. `chromatography` (science), for chemistry-colours-come-apart.
   - `inks` is up to four from black1, black2, black3, brown and green; their bands are in `INKS` and in the `about` text.
   - `labels` letters the strips; `run`, `beaker` and `ruler` are 0 or 1.
5. `orbit` (science), for physics-sun-earth-and-moon-from-above.
   - `moon` is -1 to 7, where 0 is between the Earth and the sun, counted anticlockwise with the sun to the left; `placeAngle` gives each place's angle, and `PHASES[k]` in `moonphases.ts` names its shape.
   - `places` letters the eight places A to H; `arrow`, `person` and `time` (0 noon to 3 dawn) as specified.
6. `weave` (art), for art-over-and-under. It is the first root drawing in the art family, so the installer adds an `art` block to the catalogue before `music`.
   - `cols` 4 to 8 and `rows` 1 to 6.
   - `start` is a list of 0 and 1; `step` is 1 or 2.
   - `wrong` with `wrongat`, `blank` and `float` each name a row, 0 for none; `weftOver` gives the rule.

Each is done when its checks are green and the catalog lead has it. A checker rule for any of them (the order of falls, a strip's bands, a weave's crossings, a place's phase) is added only if the catalog lead asks, since its items write their answers.

Done on 17 and 18 September 2026 by the catalog batch lead, one drawing at a time, each with its
install script in one hold of the shared check lock (prettier, root and scratchpad tsc and lint clean,
the parts suites green, a fresh golden baseline, since each is a new drawing with nothing to compare)
and then the lesson that waited on it: `falling` (batch 30), `stringphone` (batch 31, after a new
contact sheet, `new/sheet-stringphone.png`), `raingauge` (batch 32), `chromatography` (batch 33),
`orbit` (batch 34) and `weave` (installed on 18 September, after a new contact sheet,
`new/sheet-weave.png`; batch 35). No checker rule was asked for; every item writes its answers. The
install notes are in `catalog-balance/batch30-notes.md` to `batch34-notes.md` under "The install".
`physics.md` records `falling`, `stringphone` and `orbit`, and `art.md` records `weave`. Two are
installed but not yet written into a subject document: `chromatography` is missing from
`chemistry.md`'s drawings table (section 4), where only the lesson row was added, and `raingauge` has
no nature document to go in. One report from batch 31 was left for this stream rather than changed:
the three `through` takes of `stringphone` share one describe text ("with air, a table or a tank
of water between them"), so the accessible name does not say which of the three a drawing shows,
which is the question the lesson asks; it is a one-line change in the drawing's `describe`
(`batch31-notes.md`).

### 4.12 B4: the hand-drawn files

The goal is to move the 24 hand-drawn files (25 before the cleanup drops the Excalidraw house) onto the contract as drawings in `engine/parts/imported/`, each drawing one mark on the surface that holds the parsed file, as decided on 14 September.

The readers in `.scratchpad/src/core/svgAsset.ts`, `excalidraw.ts` and `strokes.ts`, and the loader in `src/art/index.ts`, change over to `engine/parts/imported/files.ts`. The imported drawings register under the loader's `file:` keys (`artKey` in `engine/space.ts`), since a file and a coded drawing may share a name.

It waits on the cleanup (4.5) and on the coordinator's go. The coordinator added it to the list on 17 September. The brief is `briefs/B4-imported.md` on port 5484. No baseline has been written, and the root side has not started.

The child build lead depends on it: `engine/ui/pictures.ts` names five creatures by `file:` (hedgehog, owl, hen, duck and cat), which today load only through the seam's `visual`. Tell that lead before the move changes what those keys resolve to.

Done on 20 September 2026 by the art shelf lead, in an exclusive window the coordinator arranged with
the other leads: the run held the check lock from 00:21 to 00:44 and the tree was still otherwise
(log `parts-move/b4-run.log`, details in `b4/run/`).

Both sides landed together, which this move needs: the root side takes `drawSvgAsset` and
`drawExcalidraw` out of `engine/ui/svg.ts`, and the scratchpad's readers draw through them, so with
the root side in and the readers still there the scratchpad cannot type-check. The readers are
deleted straight after the prepared edit, before either type check.

What landed, 26 new root files and 12 changed, with the scratchpad's 25 edited and 6 deleted:

- the surface's one mark for a hand-drawn file (`imported` in `engine/ink/surface.ts`, written by the
  SVG surface as the page wrote it before, kept by the recorder), `engine/parts/imported/hand.ts`
  (how a file is read, sized, drawn and mirrored) and the 24 drawings, one file each named by its id
- `tools/scripts/art.ts` parsing the files into `imported/files.ts`, since a drawing draws without a
  browser's parser, and refusing an Excalidraw scene that holds what the drawing does not draw
- the catalogue's 24 lines under their families, each also found by `file:` and the file's name, and
  the 24 grouping lines on the shelf
- `engine/ui/drawings.ts` keeping a loaded drawing under its own id as well as the name it was loaded
  by, which `engine/ui/map.ts` reads back off the page to find a drawing's motion
- in the scratchpad: the three imported sections are the root's drawings, `imports.ts`, `index.ts`,
  the three readers in `core/` and the loader's test stub are gone, `src/lang/assets.ts` reads the
  compiled files, and the pages, the renderer, the drawing pad and the world's fallback take a file's
  drawing from `moved.ts`

The compare against `golden-B4.json`, written before anything changed: 24 drawings, 96 renders at
level raw, markup equal 96 of 96 byte for byte, box and anchors 96 of 96, screenshots 192 of 192, no
differences. Its 96 notes are of one kind, each render gaining its accessible name, which a drawing
on the contract carries and a scratchpad visual did not. The checks: the parts suites 50 of 50 (three
new in `imported/__tests__/`), the scratchpad's tsc and guards clean and its suites 582 passing,
`check:print` over the 52 lessons that place a hand-drawn file (156 levels in 244 seconds, each
printing exactly its own sheets), `check:signed-out` on 29 pages, and the root check 12 of 14.

The three reds are other leads'. The scratchpad's shelf suite fails on `GROUPING has a line for
"bottle"`, which is the map art lead's drawing: it is in the root's catalogue and grouping and not yet
on the scratchpad's shelf. `test:server` fails in `demo.itest.ts` on a seeded hash that answers 404,
which is the owner's open question about what a `lessonHash` resolves to; the pack on disk was last
built on 18 September and this move touches no corpus file, no compiler and no seed.
`format:check` named one file of this move's, `engine/ui/__tests__/svg.test.ts`, which the
coordinator formatted rather than spend another turn of the lock.

Three runs before it were refused or rolled back, and the tree was never left half landed. The first
stopped at a type check that could not pass in the order it sat, and put back all 45 files it had
touched. The second and third were refusals: a path bug in the run's own file list, and then
`engine/parts/catalog.ts` and `shelf.ts` having moved under the copy when the map art lead's bottle
landed in both, which is what the check exists for. The repair was to take those two lists from the
tree and re-apply this move's lines to them (`b4/root-edit.py`), not to land over them. In between, a
rehearsal of mine edited the tree's scratchpad because the edit's default was the tree's own; it was
restored from the backup within four minutes, and the edit now has no default at all and the run
refuses to write outside the tree it is landing into.

The backups are `parts-move/backup-B4/` (the 44 files it touched and the documents), and the working
copy it landed from, with its rehearsal copy, is `parts-move/b4/work` and `b4/work2`.

### 4.13 C7 and C8

The goal is to move the games' pieces (C7, 63 drawings, fewer after the cleanup) and food and the page (C8, 20 drawings, fewer after the cleanup) from the files their briefs list.

Neither has a root side yet. Each follows the D5 pattern: an `analyse` of the file, `convert.py` and `fix.py` writing the root files and the catalogue and grouping lines, a baseline written before any edit, a `scratch-edit.py` with a dry run, then `land2.sh` and `checks.sh` made the way `make-land2.py` makes them.

C7's files include `sports.ts`, `playfield.ts`, `yardpieces.ts`, `rowing.ts` and `stream.ts`, which the games stream wrote. Ask before editing their importers in `src/play/`.

It waits on the cleanup. The two root sides may be prepared at the same time, and the landings go one after the other.

### 4.14 D2 then D3

D2 moves the 24 painting drawings of `painting.ts` onto `engine/pigment.ts`, which has already moved. Its importers include `src/paint/lesson.ts`, `easel.ts` and `prove.ts`, which the child build lead may move first. That lead has promised to send the new paths before D2 starts.

D3 moves the 30 chemistry drawings of `chemistry.ts`, after D2.

Both follow the pattern in 4.13.

### 4.15 E1 and E2

E1 changes the catalogue over to `engine/parts/catalog.ts` and deletes the scratchpad's lists, the old `Visual`, `pen.rc`, the adapters and the seam's `visual` fallback, and with it `engine/ui/shelf.d.ts` once the map and lesson streams no longer need the seam.

E2 makes the pen copy the points it hands rough.js, whose hachure turns a polygon's points in place, and takes every baseline again, since that changes what some drawings draw.

E1 waits on every move above and on the map stream.

### 4.16 The lamp world's `repeat for ever` and `light <colour>`

The owner decided on 17 September 2026 that the coding language gets both blocks, so that the lamp
world's lessons, which already write them in listings, become programs the interpreter can run.

Files: `engine/coding.ts` and its tests, the blocks' screen and paper forms in
`engine/parts/coding/`, and `.docs/coding.md`. The child build lead held `engine/coding.ts` on 17
September, so check who holds it before starting.

Steps:
1. Add `repeat for ever` with a step limit. When the limit is reached, the run ends with a limit
   frame, as `repeat until` already does, so a program never runs without end.
2. Add `light <colour>`, with the colours taken from the palette, and a frame that shows the lamp lit
   in that colour on screen and names the colour on paper.
3. Give both blocks their block, listing and icon forms, in the pattern `flash` used.
4. Add tests for the step limit, for each colour, and that the lamp world's listings parse.
5. Tell whoever runs the catalog that coding-a-pattern-that-never-ends can now carry a program
   answer instead of a paper listing.

Checks: the parts suites, the root check, the scratchpad suite, and a scoped print over the lessons
that draw coding blocks. Done means both blocks run, draw and print, and `coding.md` lists them.

Landed on 17 September 2026 by the catalog batch lead, with the kids app lead's agreement over
`engine/coding.ts`: `repeat for ever` ends at the interpreter's existing step limit with a limit
frame, `light <colour>` takes the palette's seven colours and keeps them on the run (`lights`,
`light(2)`) as `flash` does, both have their listing form and `light` has a lamp icon, and
`coding.md` lists them. A proposal was recorded with it rather than built: `meets` asks that a run
stopped at `end`, so a program built on `repeat for ever` can never be judged done, and a build task
on it would need a goal that reads the cycle the run produced within the frame limit (`coding.md`,
"Open questions"). The grade one lesson therefore keeps asking its questions about a printed program
rather than as a build task.

What a child sees today, and what step 2's "shows the lamp lit on screen" would still take. The
interpreter reads both blocks, so a lamp listing parses, runs and can be asked about (`light(4)`),
and a `light` frame carries its colour for anything that reads frames. What has not changed is the
lesson page. `partsOf` in `.scratchpad/src/coding/lesson.ts` takes a scene's world to be the first
node whose type is in `WORLDS` (which is `RUNS` without `program` and `blocks`) and has code, and the
listing to be the one `program` or `blocks` node beside it. In the grade one lesson's look that world
is the `pixels` row of six lights, with its own one-line code, so pressing Run paints the row and
lights line 1 of the lamp program, which is a different program; the lamp program itself never runs
on the page. That was true before these blocks landed and is not caused by them, but it means the
lamp lessons are read rather than watched. The fix is a lamp world type in
`engine/parts/coding/setup.ts` and the runner, painting one light per `light` frame along that row so
the lamp program is the world and the row is what it draws. It is a change to the runner rather than
to the language, it has been reported to the coordinator and the kids app lead, and nobody has taken
it yet.

### 4.18 The lamp world on the lesson page

The fault the coordinator brought on 17 September: the lamp lessons could not be watched. `partsOf` in
`.scratchpad/src/coding/lesson.ts` takes a scene's world to be the first node in `WORLDS` with code,
and in the grade 1 look that was the `pixels` row of six lights with its own printer line, so Run
painted the row and lit line 1 of a different program while the lamp program never ran.

What landed, checked and green, so a picker-up starts from a working page rather than from the fault:

- `engine/parts/coding/pixels.ts`: a program of `light <colour>` lines lights one square along the row
  for each line, left to right, wrapping rows; a printer program is untouched. `lampRun` there is how
  many frames the row holds, and the drawing and the runner both take the count from it.
- `.scratchpad/src/coding/runner.ts`: a lamp is played to the frame that fills its row, nine frames for
  a row of six, because a `repeat for ever` runs to the interpreter's step limit of 2000 frames, which
  is between eight and thirteen minutes of animation. It ends with what the lamp shows ("The row is
  full: 6 lights, and the program goes on in the same order") rather than with the step limit.
- `.scratchpad/src/coding/lesson.ts`: the one listing beside a world is lit only when its lines parse,
  so a drawing of a plan (`repeat for ever` over a line of dots, in the three-star question) is left
  alone rather than lit as though it were running. The catalog lead asked for that rule rather than a
  special case for the one scene.
- The catalog lead swapped one line in `coding-33-a-pattern-that-never-ends`, the look's `pixels` node,
  so the row carries the lamp program the listing prints. The printed picture is unchanged: the lamp
  program paints the same six squares the printer line painted, fill for fill, and the box is the same.
- Checks: the parts suites 47 of 47 (three new in `engine/parts/coding/__tests__/lamp.test.ts`), the
  language's suite 23 of 23, the scratchpad's coding and lessons suites, `check:print` over the three
  lessons that draw the row at 9 levels each printing exactly its own sheets, and a watch check that
  pressed Run on the look and read back what the page says. `.docs/coding.md` records the behaviour
  under "On the lesson page"; the backup is `parts-move/backup-lampworld/`.

What is left for whoever picks this up. The other lamp scenes were deliberately not changed: the rows
in `code-forever-next-light` and `code-forever-which-program` are the evidence a child reads, so they
keep their printer lines and paint as they did. No endless program can be a build task, since `meets`
is false whenever a run did not stop at `end`; `.docs/coding.md`'s open questions says what a goal for
one would need. The catalog lead's `parts-move/lampblocks-notes.md` holds the reading this started from.

### 4.17 The maze, the turtle and the pixels in the palette

The D5 root side put these three drawings on the bar suite's `BELOW` list because their grid lines
print in greys that are not in the palette. The coordinator decided on 17 September 2026 to redraw
them rather than keep the greys, since the product has one palette.

Steps: redraw the grid lines of `engine/parts/coding/`'s maze, turtle and pixels with palette
tokens, remove the three from `BELOW`, take their golden baselines again, and render a before and
after contact sheet with `new/sheet.sh` for the owner. Checks: the bar suite, the parts suites and a
scoped print over the lessons that draw them. Done means the three are off `BELOW` and the owner has
seen the sheet.

Done on 17 September 2026 by the quick items lead. The grid lines live in `coding/grid.ts`, which the
maze and the turtle both draw through, so the change is in three files. The cells print in the
palette's ink-soft (`#555555`) rather than `#9A9A9A`, and keep the grid token on screen, since the
grid token on paper is the sheet's own squares and the cells would disappear into them; the pixels
drawing takes ink-soft on both, in place of `#8A8A8A` on paper; the turtle's target line, which had
`#D0D0D0` on paper and `#DCEBF7` on screen, takes the grid token on both, and had to move for the
turtle to leave the list at all. With them, at the coordinator's decision, the maze's rock takes the
grid token in place of `#C9D1DA` on screen and `#D6D6D6` on paper. The three entries are out of
`BELOW`, and `shelf.md`'s palette paragraph has a line after it saying what this removed and what is
left of the coding shelf's drift.

Checks: the parts suites 44 of 44, `test:engine` 327 of 327, the root's tsc, lint, format check and
boundaries, the scratchpad's tsc and art guard, and `check:print` over the 24 lessons
`lessons-for.py maze turtle pixels` names (22 before batch 27 landed two more), on a server of its
own on 8532: 24 lessons at 72 levels in 99 seconds, each printing exactly its own sheets. The golden compare against
`golden-D5.json` differed where it should and nowhere else: every maze render, the turtle's four on
paper and the one screen take that draws a target, and the pixels' three on paper, with boxes and
anchors equal at 22 of 22 and the six renders that draw none of the changed lines equal byte for
byte. The fresh baseline is `golden-4.17.json`, and its three entries were merged into
`golden-D5.json` so the coding family keeps one current baseline; the file as it was is
`backup-4.17/golden-D5.json.before`, beside the four source files. Two things the run turned up that
are not this batch's: every render's accessible name went from nothing in the 16 September baseline
to the drawing's own description, which is the coding family gaining descriptions when it moved
onto the contract (the coordinator, 17 September), so a compare against a baseline written before
that move reports it for every take and it is not a defect; and the root's `check:suppressions` and
lint are red on other leads' files (`tools/e2e/grown-ups.e2e.ts` and `engine/ui/world.tsx`).

No contact sheet was rendered, since this session does not take screenshots. The owner sees the three
on the shelf page instead, at `index.html?q=maze`, `?q=turtle` and `?q=pixels`, switching the page
between screen and paper.

## 5. Decisions still open

- Decided on 17 September 2026: the lamp world gets `repeat for ever`, with a step limit, and `light <colour>` (batch 4.16); a `define` block does not take a parameter for now, so batch 27's `define square size` stays a paper listing and `coding.md` keeps named blocks without parameters.
- An icon for `flash` in `blockIcon` (`engine/parts/coding/listing.ts`). A blocks drawing in pictures-only mode shows nothing on a flash block today. We recommend a small lamp icon, long and short told apart by the length of its rays, when a lesson first draws flash blocks without words. Since 17 September 2026 `light <colour>` has such an icon, a lamp lit in the line's colour with four rays, so a flash icon can follow its shape with the rays carrying long and short.
- Decided on 17 September 2026: the maze, the turtle and the pixels are redrawn in the palette's greys and leave `BELOW` (batch 4.17).
- Where the new drawings are recorded. Moves go into `structure.md` step 3; new drawings and settings go into their subject documents (`physics.md`, `chemistry.md`, `art.md`, `curriculum.md`), and we recommend that stays the rule.

## 6. Gotchas

- The scripts in the working folder take the shared locks under `/Users/naib/Documents/code/lumischool/.scratchpad/leftover/work/` and the levels lock under `lesson-levels/` there. The temporary scratchpad of the session that wrote this document, under `/private/tmp`, is retired: everything it held that matters was copied into `.scratchpad/leftover/`, every path in this document is read against that folder, and there is one set of locks. A script elsewhere that still names a lock under `/private/tmp` (`leftover/print/lock.sh` does) takes a lock nobody else sees and must not be run as it is.
- A converter that renames a helper by pattern also renames it inside strings. D1's rename of `letter(` to `glyph(` rewrote the alphabet's anchor key in a template string, and only the compare's box and anchors caught it, since the markup and pixels were equal. When a root side is written by `convert.py`, check the anchor keys and the text in template strings as well as the calls.
- The test runner colours its totals in a log (`ℹ pass 5` inside colour codes), so a grep for `^. pass` finds nothing and a run of 586 passing tests reads as 0. `lead-lib.sh` sets `NO_COLOR=1` and strips any colour before it reads a total.
- A move that takes something out of a root file the scratchpad still draws through lands both sides in one step, and its type checks come after the deletion rather than before: with the root side in and the old readers still there, the scratchpad cannot compile (B4, 20 September 2026).
- A script that edits a tree names the tree rather than defaulting to one. B4's scratchpad edit defaulted to the tree's own scratchpad, so a rehearsal meant for a copy wrote into the tree; it now has no default, and the run refuses to write outside the tree it is landing into.
- A working copy taken hours before a landing goes stale in the lists other leads add to (`engine/parts/catalog.ts` and `shelf.ts`). The landing checks every file it will change against the copy's manifest and refuses rather than landing over one; the repair is to take that file from the tree and re-apply the move's own lines to it, which is what `b4/root-edit.py` does for the two lists.
- A fix a run script writes into a root file with `sed` must be formatted in the same step. D4's fix to `fretting.ts` left a call on one line that Prettier breaks in two, and only the root's format check at the end of the checkpoint caught it.
- A converted drawing can hold a setting as required that the scratchpad had optional (D4's staff `meter`), and a converted shape can write "none" differently (D4's neck turn, `undefined` where the scratchpad wrote `""`). The scratchpad's type check before the deletion finds the first; a scratchpad suite that asserts the old value finds the second.
- A compare against a baseline written days earlier also reports what changed on the shelf since, such as a reworded reason for holding still. That is why a run compares before the move as well as after, and `judge.py` counts only what the move changed.
- Screenshots depend on the machine's load when Chrome uses the GPU. A busy machine rasterises the odd edge pixel differently. `golden.mjs` now runs without the GPU, so baselines written before 15 September 23:30 (B1 to B6, C1 and the games' 14) have screenshot hashes a compare today will not match, though their markup hashes do. Use `golden-ab.mjs` to settle a screenshot that differs with the same markup.
- The shared dev server on 5173 runs with hot reload off, so a lesson added after it started never finishes drawing there, and `check:print` reports "the page never finished drawing". On 17 September this was first misread as the lesson's fault, which led to an unneeded urgent fix. Print on a server started after the files. `lessons.html` falling back to the index is the sign.
- The `LESSONS` variable of `check:print` takes lesson ids from each file's `lesson` line, not file names. A list of file names printed nothing and passed.
- A hand-drawn file and a coded drawing can share a name: the harbour's `file("boat")` and the physics `boat`. The loader keys files as `file:` plus the name (`artKey`), and B4 must register imported drawings under those keys.
- A scratchpad suite that never finished held the check lock for seven hours on 16 September and took the load to 96. Run suites one file at a time under `timeout 240`, and give every heavy step a limit.
- `trap release EXIT INT TERM` swallows a TERM: the release runs and the script carries on. Use `trap release EXIT` and `trap 'release; exit 130' INT TERM`. Do not edit a zsh script while it runs.
- Locks change hands within seconds. A script that polls every fifteen seconds loses the race, and one that takes the browser lock and then waits for the check lock blocks the other streams.
- The scratchpad's catalogue suite had a sanity bound of "more than 200 drawings defined in src" that every move lowers. It now checks that the scan read `src/art/catalog.ts`. Look for other counts like it when a suite fails after a move.
- Other streams remove and add suites while a run is going. "exit 1 pass 0 fail 0" with "Could not find" in the suite's log means the file was removed, not that it failed.
- A drawing whose file two streams edit (such as `engine/coding.ts`) needs one of them to announce and the other to hold. Re-read a shared file right before editing it, and edit in place.
- A compare of a drawing that gained takes exits 1 with "not in" lines for the new takes. That is expected; the old takes must be equal.
- `pen.fill` takes palette tokens only. A skin tone is written as `{ fill, fillStyle: "solid" }` from `SKIN` in `engine/paper.ts`, with its print grey on paper.
- On paper every marker becomes a hatch. A drawing whose meaning is which strip lies on top (the weave) or which half is lit (the orbit) needs white for one of the two, or the difference disappears.

## 7. Pointers

- The plan and the record: `/Users/naib/Documents/code/lumischool/.docs/structure.md`, step 3 of "The order from here".
- The move briefs and their README: `/Users/naib/Documents/code/lumischool/.scratchpad/leftover/parts-move/briefs/`.
- The notes: `parts-move/b3-notes.md` and `parts-move/c1-notes.md`.
- The lock rules: `/Users/naib/Documents/code/lumischool/.scratchpad/leftover/work/CHECKS.md`.
- The baselines:
  - `parts-move/golden-*.json`, including `golden-D1.json` and `golden-D4.json`, which the two remaining scratchpad sides compare against.
  - `parts-move/new/out/golden-before-wrapped.json` and `golden-wrapped.json`.
- The backups:
  - `parts-move/backup-0.1` to `backup-0.4`, `backup-B1` to `backup-B6`, `backup-C1` to `backup-C9`, `backup-D1`, `backup-D4` and `backup-D5`
  - `backup-pigment`, `backup-p2`, `backup-settings` and `backup-tape`
  - `backup-new-wrapped` (with `physics.md` as it was)
  - `backup-flash` (`engine/coding.ts`, its test, `listing.ts` and `coding.md` as they were)
  - `backup-D5/structure.md.before` and `backup-D5/.scratchpad/test/catalog.test.ts`
  - `backup-D1/.scratchpad/` and `backup-D1/root-4.1/` for 4.1's scratchpad side, the alphabet and the documents
- The batch logs: `parts-move/d1-run.log` (4.1, and `d1-run-1.log` for the first run the compare stopped), `d4-run.log` (4.3, with `d4-run-1.log` to `d4-run-3.log` and `d4-fix.log`), `cleanup-run.log` (4.5, with `cleanup-run-1.log`) and `b4-run.log` (4.12, with `b4-run-1.log` to `b4-run-4.log`, `b4-try.log` for the rehearsals and `b4-budget.log` for the child's map measurement), with each run's details in the batch's `run/` folders.
  - `backup-D4/.scratchpad/`, `backup-D4/root-4.3/` and `backup-D4/after-4.3/` for 4.3
- The staged drawings and their contact sheets: `parts-move/new/engine/parts/` and `parts-move/new/sheet-*.png`.
- The unused-drawings record: `parts-move/unused.md`, `parts-move/unused.png` and `parts-move/unused-ids.txt`.
- The catalog lead's specifications for the new drawings: section 4.6 above, and `catalog-balance/gaps.csv` and `plan.md` in `/Users/naib/Documents/code/lumischool/.scratchpad/leftover/catalog-balance/`.
- The golden and A/B scripts: `/Users/naib/Documents/code/lumischool/.scratchpad/scripts/golden.mjs` and `golden-ab.mjs`.
