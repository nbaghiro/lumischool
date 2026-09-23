# Repository structure

Status: decided, September 2026. The owner first chose option 2, domain modules beside technical
modules. When that left about 45 entries at the root, the owner chose to file the same modules into
two drawers (layout A of the root review): `engine/` for the modules named after the machine and
`school/` for the modules named after what a family would recognise, with the database module inside
`server/` as `server/db/`, renamed from `store/` so it is not confused with a store on the client.
The decided shape is the next section, and it is what we build to. The options, the comparison and
the recommendation follow it as the record of how we got there.

What this document decides: how many modules there are and what they are named after, how many files
those modules hold and how long a file is allowed to get, how the import rules are expressed and
enforced, where the four apps live, where the backend lives, and which module owns each piece of the
data model.

What it does not reopen: the notation as the source of truth
([notation.md](notation.md), [notation-vs-json.md](notation-vs-json.md)), the pack rule, the data
model itself ([data-model.md](data-model.md) recommends the local-first log with two amendments from
the log-and-projections option, and that recommendation is an input here rather than a question), and
the product's own non-goals ([product.md](product.md)).

## Decided: the shape we build to

Weekly letters use `school/family/letter.ts` for evidence and prose, `apps/home/letters.tsx` for
reading/printing/preferences, and `server/letters.ts`, `mail-design.ts`, `mail-job.ts` and
`db/mail.ts` for delivery. `mail_preferences` and `mail_deliveries` are operational mail tables,
separate from the seven original product tables. Templates use the root brand/artwork and no
prototype imports. Detailed mail is permitted only by explicit recipient opt-in; see weekly-letter.md.

These are the rules the tree follows. `boundaries.ts` and its check enforce the reach, the database
guard in `tools/scripts/check-db.ts` already enforces the database's part of it, and
[CLAUDE.md](../CLAUDE.md) at the repo root carries the conventions for the code inside it.

- The root holds six folders (`apps/`, `engine/`, `school/`, `server/`, `content/`, `tools/`), the
  design documents and the config files. There is no `src/`. The prototypes are in `.scratchpad/`,
  which git ignores and which is deleted once it is empty; the curriculum and the hand-drawn art are
  data, so they live in `content/` and are tracked.
- A module named after the machine goes in `engine/`; a module named after something a family would
  recognise goes in `school/`. The name decides the close cases: `answer` and `space` are machinery,
  `year` is the school's.
- A module is a single file until it holds more than one concept, and then it is a directory of
  files. A file is as long as its concept is. A module never changes drawer when a second app starts
  using it.
- A module has one phase: it runs in an app, it runs only while authoring, or it is data. `server/`
  and `server/db/` have a fourth, `server`, which no app contains.
- Only `engine/ui/` touches the page.
- Only `server/` imports `server/db/`, no app contains `server/` or `engine/notation/`, and any module
  may `import type` the row types from `server/db/schema.ts`, since a type import is erased at build.
- The apps are SolidJS, built by Vite with one entry per app, and the server is Node (13 September
  2026). A screen is a Solid component in its app; what two apps share is a component in
  `engine/ui/`. The site is prerendered. Every app is served from one origin on paths, as
  [auth.md](auth.md) ("Hosts") records.
- Every test suite lives in a `__tests__/` folder in the directory that holds the code it tests, and
  the drawer's own `__tests__/` holds the suites for its single-file modules. `*.test.ts` needs
  nothing, `*.itest.ts` needs Postgres, and `tools/e2e/` holds the tests against the running apps.
- Imports across drawers are relative for now (`../../engine/answer`), with no file extension,
  which Node finds through `tools/scripts/resolve.ts`. Aliases are still to
  come, as package `imports` (`#engine/...`), which Node, Vite and TypeScript all resolve the same
  way.

```
lumischool/
├─ .docs/                          the design documents
├─ apps/                           what people open: SolidJS screens and entry points, no logic of
│  │                               their own, all on one origin
│  ├─ kids/                        the children's view at /kids: journal, lesson, game, music
│  ├─ home/                        the grown-ups' app: sign in, journal, week, mark, letter, records
│  ├─ studio/                      authoring at /studio: the shelf, the editor, the drawing pad, the forms
│  └─ site/                        the marketing site, prerendered, at / for a visitor signed out and
│                                  at /home for everyone
├─ engine/                         the machine, named after what it is
│  ├─ paper.ts                     the 5 mm square, page sizes, colour tokens as data
│  ├─ numbers.ts                   exact fractions and decimals
│  ├─ expr.ts                      the small expression language inside the notation
│  ├─ answer.ts                    the event and answer types, declared once          (built)
│  ├─ scene.ts                     named parts on the grid, anchors resolved
│  ├─ pack.ts                      the compiled content format and its reader
│  ├─ space.ts                     camera and zoom for the map and the journal
│  ├─ arrange.ts                   a part the child arranges: its boards, measures and layouts (built)
│  ├─ ink/                         surface, pen, draw, sheet
│  ├─ parts/                       a folder per family with a file per drawing, guide/ among them,
│  │                               drawing.ts, catalog.ts, shelf.ts, lettering.ts, imported/, and
│  │                               brand.ts, the logo, which started parts/ early
│  ├─ sound/                       pitch, beat, judge
│  ├─ motion/                      spring, timeline, loop, gesture, geometry, trace, flight, camera,
│  │                               spawn, tune, steer, glide, burst, drop, flow, sway, plane (the
│  │                               map's paper plane), world (what a world plays), and the animation
│  │                               module, the physics bodies, the game scene, cues and pad
│  ├─ notation/                    authoring only: notation, vocabulary, verify, compile
│  ├─ ui/                          the only module that touches the page: the Solid components the
│  │                               apps share, svg, view, stage, fullscreen, sound, palette.css,
│  │                               and wire, api and kid: the grown-ups' client for the API, the
│  │                               children's, and what the two share; snapshots/ holds the pictures
│  │                               of the map a page shows until its live map is drawn; form holds
│  │                               what a child's screen presses and fields the grown-ups' own
│  │                               controls, apart so the child's script never carries them; and
│  │                               reading, overlay and hash draw a world as written and a look over
│  │                               a page for the grown-ups' map (.docs/parent-app.md)
│  └─ __tests__/                   the suites for engine's single-file modules
├─ school/                         the product, named after what a family would recognise
│  ├─ lessons.ts                   the lesson a child sits: the questions asked, each try checked
│  ├─ voice.ts                     the rules on what the world's guide may say, as a check over a line
│  ├─ games/                       games, prove, and one file per mechanic
│  ├─ worlds/                      worlds, one file per world, terrain, overworld, roll, trail, rewards
│  ├─ year.ts                      tracks, units, the path, prerequisites
│  ├─ record/                      record; read and household are planned and not written
│  ├─ family/                      family, access (built), privacy
│  ├─ assistant/                   assistant, envelope
│  ├─ studio.ts                    authoring logic: forms from the vocabulary, previews, the repair loop
│  └─ __tests__/                   the suites for school's single-file modules
├─ server/                         the back end
│  ├─ http.ts                      the one origin's paths and the routes            (first slice)
│  ├─ api.ts                       the API's shapes, types only, for the pages to import as types
│  ├─ auth.ts                      codes, passkeys, sessions, children's views, the PIN (first slice)
│  ├─ sync.ts                      our own: the drafts a page appends, and what a page reads back
│  ├─ pack.ts                      the pack the family's lessons are served from    (built)
│  ├─ email.ts                     Resend HTML/text transport; opted-in weekly letters
│  └─ db/                          the database module                                (built)
│     ├─ schema.ts  scope.ts  client.ts  events.ts  keys.ts  content.ts
│     ├─ migrations/               the generated SQL, the apply path, the local role setup
│     └─ __tests__/                the suites and their shared test database
├─ content/                        data, read through one loader each, never imported by path
│  ├─ curriculum/                  every lesson and question as notation
│  └─ art/                         the hand-drawn svg, excalidraw and stroke files
├─ tools/
│  ├─ brand.ts                     the Vite plugin that makes the logo's files for the apps (built)
│  ├─ first-view.ts                the Vite plugin that makes the site's opening data and preloads
│  │                               what each app's first view needs (built)
│  ├─ __tests__/                   the suites for brand.ts and first-view.ts
│  ├─ scripts/                     the guards, the database scripts, Node's resolver, and
│  │                               map-snapshots.ts, which draws engine/ui/snapshots/ (built)
│  └─ e2e/                         end-to-end tests against the running apps
├─ .scratchpad/                    the prototypes, gitignored, emptied as each module moves in
├─ boundaries.ts                   who may import whom, and each module's phase
├─ docker-compose.yml  vite.config.ts  drizzle.config.ts  tsconfig.json  package.json
├─ .oxlintrc.json  .prettierrc  .prettierignore  .env.example
└─ CLAUDE.md  README.md
```

That is the same 21 modules as before: thirteen in `engine/`, since `space` counts as machinery, and
eight in `school/`, with `server/` and its database beside them. `studio.ts` is author time, like
`engine/notation/`, and holds logic rather than screens, so it stays a module and `apps/studio/` only
shows it.

### Who may import what

The reach lives in `boundaries.ts` as data, keyed by module name; the drawer a module sits in does
not change what it may reach.

```
paper        nothing
numbers      nothing
expr         numbers
answer       nothing
scene        paper, expr, parts
pack         answer, expr, scene
ink          paper, parts, scene
parts        paper, ink/surface, ink/pen, numbers, sound/pitch, sound/keys, sound/voices, sound/beat, sound/fretted, motion/animation, coding, pigment
sound        numbers
coding       nothing
pigment      nothing
motion       nothing
arrange      answer, expr, motion/lever, motion/cuts
notation     parts, games, expr, numbers, scene, ink, sound, answer, pack, arrange, paper, coding, pigment
ui           paper, ink, parts, scene, sound, motion, space, answer, pack, arrange, coding
space        paper, ink, parts
lessons      pack, answer, scene, ink, expr, arrange
games        parts, scene, answer, motion, numbers
worlds       parts, paper, motion, space, pack, year, record/record, record/read, answer
year         pack, answer, record/record
record       answer, numbers
family       pack, year, tracks, record/record, record/read, answer
assistant    pack, record/record, record/read, answer
db           answer
server       db, answer, family, record, year, pack
apps/*       by phase, in the table below
```

| App | May import |
|---|---|
| `kids` | run time modules and `engine/ui/`; never `engine/notation/`, never `server/` |
| `home` | the same, plus `school/record/household.ts` |
| `studio` | everything above, including `engine/notation/`; never `server/` |
| `site` | run time modules and `engine/ui/`, prerendered |

`boundaries.ts` also holds what the two lists above leave implicit, and its check enforces it:

- `db` and `server` have the phase `server`, which no app contains, so "never `server/`" follows
  from the phases (decided 13 September 2026).
- `worlds`, `family` and `assistant` name the file of `record` they read, `record.ts`, so a file of
  `record` they do not name reaches only the apps that name it, whatever the child's app imports.
  `read.ts` and `household.ts` are planned and not written, and a reach or an app's row may not name a
  file that is not there, so both are out of the table until the files land (17 September 2026):
  `record/read` went from three reaches and `record/household` from the `home` and `studio` rows, and
  each comes back in the change that writes its file. `check-boundaries` fails on a named file that is
  missing, which is what let the two sit in the table unwritten.
- Two files may be imported with `import type` from outside the reach, since a type import is erased
  at build: the row types in `server/db/schema.ts` by any module, and the API's shapes in
  `server/api.ts` by the apps and by `engine/ui/`, whose `api.ts` is the one client for the API.
  `import { type X }` stays an import under `verbatimModuleSyntax`, so it does not count.
- A file an app's row adds, such as `school/record/household.ts` for `home` and `studio`, is withheld
  from the apps that do not add it.
- A suite in a drawer's own `__tests__/` belongs to the module it is named after, so
  `engine/__tests__/space.test.ts` has the reach of `space`.
- Each module's and app's row names the packages its files may import, such as `solid-js` for
  `engine/ui/` and the apps, `roughjs` for `ink`, and `drizzle-orm` and `postgres` for `db`. A suite
  may also import Node's builtins, since it runs only in Node. `parts` names none, so a drawing
  reaches rough.js and perfect-freehand only through `ink/pen`, and the guides' inked strokes, which
  call perfect-freehand themselves in the scratchpad, draw through the pen when they move. The reach
  of `parts` above names `sound/beat`, `sound/fretted` and `motion/animation` for step 3, and
  `boundaries.ts` gains each with the move that first needs it.
- `import.meta.glob` imports what it matches, and `new URL("...", import.meta.url)` imports the file
  it names in any file Vite bundles. A server's, a suite's or a tool's file runs in Node and reads such
  a file when it runs, so there it is not an import.
- Nothing imports an app, another app included, and nothing at the root imports from `.scratchpad/`
  except the apps and `engine/ui/` through the seam `scratchpad:art`.
- `studio.ts` has no row yet, so the check refuses its files until one is agreed.

### Where the data model lives

| Piece | Home |
|---|---|
| The nine tables, the migrations, the seed | `server/db/` |
| The one way in, and the lookups before a family is known | `server/db/client.ts` |
| The row types, `Family`, `Kid`, `Event` and the rest | `server/db/schema.ts`, inferred from the tables, and importable as types from anywhere |
| The event and answer types | `engine/answer.ts` |
| Progress and the current lesson per track, worked out from events | `school/record/record.ts` |
| The journal's rewards, worked out from the same events | `school/worlds/rewards.ts`, reading through `school/record/` |
| Who may do what | `school/family/access.ts` |
| Sign-in and the key flows | `server/auth.ts` |
| Sync | `server/sync.ts`, our own: uploads of appended events through `withFamily`, and what a device downloads |
| The pack format, and writing packs | `engine/pack.ts`, and `engine/notation/compile.ts` |

### How we get there

`server/db/`, `engine/answer.ts`, `tools/scripts/`, `docker-compose.yml` and `drizzle.config.ts` are in
place, and `npm run check` covers them. Everything else is in `.scratchpad/src/` today, and the table in
"Moving the scratchpad in" below says which module each file goes to. The first step moves nothing:
write `boundaries.ts` and its check. Then modules move one at a time from the bottom of the reach up,
`engine/paper.ts`, `engine/numbers.ts`, `engine/ink/`, `engine/parts/`, each with its tests green
before the next. A module that has moved is deleted from the scratchpad in the same change, so there
is never a second copy.

`engine/paper.ts` has moved, with its tests in `engine/__tests__/paper.test.ts`. It holds what was
`src/core/tokens.ts` (the square `U`, `lineTicks`, the token names, the print palette, the roughness
levels, and the markers with their hatches), the page sizes that `src/core/sheet.ts` and
`src/pages/poster.ts` each declared, now one table in millimetres that the poster turns landscape,
and a lesson sheet's margins in squares, which were bare numbers in `src/lang/lesson-render.ts`. It
also carries `engine/ui/palette.css` as data, and its test fails if the two differ. `readTokens`
reads the palette off an element's computed style, so it touches the page and went to
`engine/ui/read-tokens.ts`. `WEIGHT` had no reader and did not move. The sizes a lesson prints on
stay `PaperSize` in `engine/answer.ts`, which may import nothing, and the scratchpad's sheet looks
that type up in `PAGE_SIZES`, so a size added there without its dimensions here fails the
scratchpad's type check. Some copies remain in the scratchpad until their files move:
`test/sheet-width.test.ts` writes out the A4 width and the writing column again, the palette is
copied into `src/world/check.ts` (a scratchpad test holds it to `palette.css`), and `src/styles/lessons.css` draws the margin rule on column 4 itself. How wide things
print is now named there too: `SHEET_COLS` (42, an A4 sheet in squares), `SCENE_COLS` (37, the sheet
past its margin, which the paginator, the builder's check and the sheet test all read) and `TEXT_COLS`
(34, the measure a line of text is set to).

`engine/space.ts` has moved, with its tests in `engine/__tests__/space.test.ts`. It holds what was
`src/space/camera.ts`, `lod.ts` and `seed.ts` (the camera and zoom, the paper's layers by zoom and the
stable seeds), reads the size of a square from `engine/paper.ts`, and the scratchpad imports it from
the root. The canvas view that turns pointer, wheel and key input into camera moves is `ui/view.ts`
(`src/space/view.ts` moved with the child's map, 15 September 2026). The year map, `journey.html`,
was deleted rather than moved (17 September 2026, the map plan's decision 10): the map of worlds
replaced it and nothing at the root read it. `src/space/` went with it (the year's layout, its
drawings, the lesson laid out as a place, the year list and shelf, the minimap and the canvas's own
ink), and so did what only that page read in `engine/space.ts` (the year map's levels and their
thresholds, the shelf's zoom, the label scale and the edge pointer). What a child writes on paper is
still to come as `ui/working.ts`, from `src/world/working.ts`, after the privacy decision in
[journal.md](journal.md), and `src/space/progress.ts`, the sample child's made-up record, stays until
`record/fixtures/` takes it.

`engine/numbers.ts` has moved, with its tests in `engine/__tests__/numbers.test.ts`. It is what was
`src/lang/rational.ts`, with the same behaviour, and `engine/expr.ts` and the scratchpad's
`src/ai/materials.ts` import it. The tests that reach it through the expression language moved
with `expr.ts`.

`engine/expr.ts` has moved, with its tests in `engine/__tests__/expr.test.ts`. It holds what was
`src/lang/expr.ts` and the half of `src/lang/templates.ts` that reads a text's placeholders
(`pieces` and `uses`), with the same behaviour, and it imports only `engine/numbers.ts`. The other
half, `fill`, `fillParts` and `noun`, stays in the scratchpad's `templates.ts`, because filling a
role's placeholder needs each prop's singular and plural from `NOUNS` in `src/lang/registry.ts`.
Where it goes needs a decision, since the nouns will be in `parts/` or `notation/vocabulary.ts`
once the registry splits, and `expr` may reach neither: either `fill` takes the noun lookup as an
argument and moves here, or it moves to `scene.ts` with instantiation, its main caller, since
`scene` may reach both `expr` and `parts`. Neither was taken (22 September 2026): nothing at run
time fills a noun, so the filler is in `notation/instantiate.ts` and `NOUNS` in
`notation/vocabulary.ts`. `showError` had no reader and did not move, and neither did the
tokenizer's tolerant mode, which nothing called. One case changed on purpose: a function name that
every JavaScript object has, such as `toString`, used to pass the name check and then fail with a
JavaScript message, and it is now an unknown function in both. The tests that run the language
through the workspace (`test/check.test.ts`, `test/content.test.ts`, `test/grade4.test.ts` and the
rest) stay in the scratchpad until `notation/` moves. `src/ai/materials.ts` calls `evaluate`,
`pieces` and `fill`, but `assistant` may reach neither `expr` nor `scene` (nor `numbers`, which it
also imports), so its reach or its materials need a decision before it moves.

`engine/motion/` has moved: `spring.ts`, `timeline.ts`, `loop.ts`, `gesture.ts`, `geometry.ts`,
`trace.ts`, `flight.ts`, `camera.ts`, `spawn.ts`, `tune.ts`, `steer.ts`, `glide.ts`, `burst.ts`,
`drop.ts`, `flow.ts` and `sway.ts`, one file each, and their tests in `engine/motion/__tests__/`.
None of them touches the page, since the recogniser is fed samples and the ticker is given its clock
and its frame scheduler by the caller, so nothing went to `engine/ui/` with them. The scratchpad
imports them from the root, and the rest of `src/engine/` stays there until it moves. `stage.ts`
goes to `ui/stage.ts`, as the one file there that touches the page. `scene.ts` and `cues.ts` go to
`motion/`: the stage draws the scene and `ui` may not import `games`, and the scene names its cues.
`pad.ts` has moved there, since the map's flight reads it, and the scratchpad's `src/engine/pad.ts`,
which was a verbatim copy of it until 15 September 2026, re-exports it for the games until step 8
moves them. Two files came from `school/worlds/` the same day, as machinery only a page runs:
`plane.ts`, the map's paper plane (a fixed-step game on a `Pad`, from `school/worlds/flight.ts`; the
name changed because `flight.ts`, a throw's arc, was there first), and `world.ts`, what a world reads
off a drawing's declaration, the budget every declaration keeps, `isWorking` and `Lingering` (from
`school/worlds/motion.ts`). They take `Pt` and `Rect` from `geometry.ts`, so `motion` still reaches
nothing, and `plane.test.ts` holds the plane beside them. `bodies.ts` goes there too, with
`boundaries.ts` allowing planck in that file alone, and so does `animation.ts`, as
[animation.md](animation.md) says. `pieces.ts` and `hands.ts` are the hands-on games' shared
controller and the contract their bindings implement, used by nothing but the games and the games
page, so they go to `school/games/` (decided 13 September 2026), and [engine.md](engine.md) says
so.

`engine/ink/` has moved as `pen.ts` and `surface.ts`, with the page's half in `engine/ui/svg.ts`, and
their tests in `engine/ink/__tests__/` and `engine/ui/__tests__/`. The pen is what was
`src/core/pen.ts` and `strokes.ts`, and it now draws onto a surface instead of building SVG: it makes
each shape with rough.js's generator, seeded as before, and hands the surface the paths rough.js's
own SVG renderer would have painted. `surface.ts` holds the surface, the recorder a test reads, and
the declaration half of `src/core/visual.ts` (a drawing, what it draws with, its anchors), written
over the surface's group. `ui/svg.ts` holds the SVG surface and binds the declaration to it:
`SvgPen`, the pen on an SVG, the SVG `Ctx` and `Visual`, `render`, `part` and `drawAnchors`, and
`el` and `text` from `src/core/svg.ts`. The geometry the pen draws with from that file
(`roundedRect`, `starPoints`, `rng`) went to `ink/pen.ts` instead, since a drawing needs it and
`parts` may not reach `ui`. The shelf and the other pages that draw came out byte for byte the same
in headless Chrome, and `ui/__tests__/svg.test.ts` holds the SVG surface to rough.js's renderer
attribute for attribute. Two cases that `check:art` refuses changed: an imported SVG's `data-fill`
that is not a token is left alone rather than set to a colour that does not exist, and an anchor side
that is not a side reads as up.

The drawings still draw onto SVG rather than onto the surface, because most of them reach past the
pen. Of the 511 drawings drawn in code, the seven guides among them, 134 draw only with the pen and
377 build SVG themselves with `el`, `text` and `part` from `ui/svg.ts`: 320 write text, 156 lay a
plain shape (mostly the white patch under a number on paper), 37 group with a transform, 40 mark a
part that moves, 7 clip or fill with a gradient (`guide.glow`, `fretboard`, `guitar`, `ukulele`,
`lane`, `paperplane`, `paintsheet`), and 6 take a shape's group from rough.js's SVG renderer through
`pen.rc` (`handwriting`, `brace` and four guides). The 17 hand-drawn SVG files are copied in as SVG,
and the four Excalidraw scenes draw their text, turned shapes and freehand line with `el`; the four
stroke files draw through the pen. `pen.rc` is also used by two pages: `engine/ui/map.ts` and
`engine/ui/scenery.ts`.

The surface now has what those drawings build, as move 0.1 of step 3 (14 September 2026). A
drawing's context carries the surface as `ink` beside the pen, and `ink/surface.ts` gives it
`letter` for a line of lettering in one of the three faces, with its spacing, its axes, an outline
or a curve to run along; `plain` for a rectangle, circle, ellipse or path drawn exactly; `group` for
a turn, a guide design's layer, a hook a page finds, round joins, an opacity or a part that moves;
`part`, which is a group on screen and the drawing's own group on paper; and `clip` and `pattern`,
the second a radial glow or a repeated tile. The recorder keeps each of them. `svgSurface` in
`ui/svg.ts` draws them element for element and attribute for attribute as the drawings built them,
which a survey of every take set out, and it mints the ids a clip, a pattern or a curve needs per
render, from the drawing's id and how many renders of that drawing on the page have minted one. A
drawing's ids then no longer depend on the drawings rendered before it, as they do now in the
guides and the strings, which count them in a module. `render` names a drawing that declares
`describe` for a screen reader, with `role="img"` and its description, and hides one whose
description is null. Nothing that existed changed: all 3,210 renders of the 544 drawings on the
shelf, on screen and on paper, gave the same markup, box and anchors before and after. Each
drawing's calls are rewritten onto the surface during its own move into `parts/` rather than before
it (decided 14 September 2026). After the last move `Ctx` and `Visual` are bound to the surface's
group, the SVG ones leave `ui/svg.ts`, and `pen.rc` goes.

Three things stayed in the scratchpad. The readers of hand-drawn files (`svgVisual`,
`excalidrawVisual` and `strokeVisual`, in `src/core/svgAsset.ts`, `excalidraw.ts` and `strokes.ts`)
go to `parts/imported/`, and only what they draw moved: `drawSvgAsset` and `drawExcalidraw` to
`ui/svg.ts`, and a stroke to the pen. `src/core/sheet.ts` did not move to `ink/sheet.ts`, because it
draws the teacher's tick, loop and highlight from `src/art/marks.ts`, which is `parts` and still in
the scratchpad, and because it builds the page itself, placing HTML on the grid, which only `ui` may
do. It moves after `parts/`, split into the layout in `ink/sheet.ts` and the HTML in `ui/`.

`engine/parts/` has started early, with `brand.ts` (13 September 2026). The owner chose the paper
bird as the logo, and the apps need it in their heads and top bars before the shelf's drawings move,
so the bird and the machinery that lays out its lockups, icons and files moved from the scratchpad's
`src/brand/` on their own. It takes its colours from `engine/paper.ts`, its tests are in
`engine/parts/__tests__/brand.test.ts`, `engine/ui/logo.tsx` draws it on a page, and `tools/brand.ts`
makes the apps' favicons, icons and link preview from it ([brand.md](brand.md)). The four
logo directions not chosen stay in the scratchpad as the record of that exploration, drawn with the
root's machinery. The brand is not on the art shelf, so nothing in the catalogue moved with it.

The first apps are in place, and their sign-in screens were built in Solid ahead of step 5
(14 September 2026). `apps/home` and `apps/kids` are served on one origin on 8500
([local.md](local.md), "The apps"), built by Vite with one entry per app, and each screen's code is
loaded the first time it is opened. The grown-ups' app reaches the API only through `engine/ui/api.ts`,
which moved out of the scratchpad with its tests, and the children's view only through
`engine/ui/kid.ts`, both on the request and the row checkers in `engine/ui/wire.ts`;
`check:kids-build` fails if the children's build carries a grown-ups' route. The rest moved too, as did the palette (`engine/ui/palette.css`) and the fonts.
The screens follow sign-in design B ([auth.md](auth.md), "Decided"), and what the two apps share is
a Solid component in `engine/ui/`: the page with its bar and the map behind it, the postcard, the
form controls with the family PIN's boxes, and the children's stamps. The tablet's code, its QR and
`engine/qr.ts` went when a parent's opening a child's view replaced the tablet. `engine/ui/chrome.ts`,
which built the first screens by hand, is gone. Their drawings and the map behind them come from the
catalogue through the loader (`engine/ui/drawings.ts`). The seam `scratchpad:art`, the alias typed
by `engine/ui/shelf.d.ts` that carried them until the catalogue flip, went with the site's rebuild
(22 September 2026); nothing in the root reaches the scratchpad, and `check:boundaries` refuses any
import of it, by alias or by path.

What a grown-ups' or a child's screen loads first is its own code, the page's and the fonts, and
nothing from the scratchpad, so the screen and its card are drawn and answer before any drawing
arrives. The drawings are loaded once the page is idle, and the bird in the bar, the postcards'
stamps and the children's pictures are drawn then. Until 22 September 2026 they came through the
seam, which first carried the whole shelf, about 1.5 MB, because the scratchpad's own pages called
its world drawings synchronously, and from 16 September 2026, when the painters moved, only what had
not moved; since the seam went they come through the loader alone (`engine/ui/drawings.ts`), each
from its own chunk of the catalogue, so a page downloads the drawings its worlds name and no others. The map's box is squared paper from the first stylesheet, and as the screen is drawn it shows a
snapshot of the framed map from `engine/ui/snapshots/`; the live map is drawn after the drawings have
loaded, again once the page is idle and a step at a time, and fades in over the snapshot. Screens
opened at 700 px or narrower keep the snapshot for decorative backgrounds, including after rotation,
to avoid rendering a full SVG map behind the page. Interactive maps still use the live renderer. It is the
country with nobody on it (`countryViewOf` in `school/worlds/view.ts`, drawn by `Overworld`): every
world of every year and the ways between them, in their colours, with no child's path, place or
dated stamps. It loads the map's own modules, about 0.2 MB more, which carry no notation and never
the corpus. `tools/__tests__/first-view.test.ts` holds the map's code to 1,850,000 bytes; the limit
rose from 1,700,000 for the nine new worlds on 14 September 2026. The measure was everything the
seam reaches; since the loader (16 September 2026) that reach is the whole catalogue through its
dynamic imports, drawings no map draws included, so the test now measures what the opening map
downloads, the loader's static reach with the chunks of the drawings the worlds name (1,159,940
bytes that day through the seam, of a catalogue of 1.22 MB; 920,001 bytes on 22 September 2026,
measured from `apps/site/ground.ts` once the seam had gone), and holds apart that nothing on its
never list is reachable from the site's page at all, static or dynamic. Small modules many
chunks share (the guides' designs and kit, the ticker and the timeline) are one chunk each by
`build.rollupOptions.output.codeSplitting` in `vite.config.ts`, since every chunk that imports
another dynamically carries the list of chunks to preload in its own bytes.

The site came forward from step 7 (13 September 2026), so that a visitor can open it from the
sign-in pages and a parent who is signed in can reach it from the logo, as galleo's marketing build
and app hand over to each other. `apps/site` is Site M as a Solid app on the one origin: `server/pages.ts`
serves it at `/` to a visitor with no session cookie and at `/home` to everyone ([auth.md](auth.md),
"Hosts"), and each section of the page is a Solid component with the site's own words. The other
apps draw the country without the sample child, as above, and never carry the corpus. Site M's own
page left the scratchpad in the same change. What the site says about its sample child and every
picture of that child are the root's own since 22 September 2026. The sample child is
`school/worlds/sample.ts`: their made-up record (a share of the path behind them, nothing naming a
lesson), where they stand, the stops beside the map, the cards, the subject tiles, the lessons a
visitor reads first, and the words the site says, all read off a corpus and the worlds;
`tools/site-sample.ts` works the words out at build from the same function over the visitor pack's
index, with the three things only the notation knows (how many items the curriculum holds, how many
ways the day's question is drawn, the strip above a title) read off the workspace, and
`tools/first-view.ts` writes them with the sample child's journey and the day's question laid out
each of its ways into the JSON the page links (about 19,300 bytes against the data's budget of
25,000), beside a visitor's pack of its own (api.md): every lesson at its medium level with nothing
a visitor's sheet does not show, 7.2 MB against the family pack's 55, under
`assets/site-pack-<digest>/`, compiled once per change of the curriculum's text and kept under
`node_modules/.cache/site-pack/`. The opening's map is drawn from the journey alone (`viewOfTrip` in
`sample.ts`, through `apps/site/ground.ts`); the pictures below it read the pack's index once the
opening map is drawn and the page idle (`apps/site/school.ts`), work the same child out from it, and
draw with the moved modules (`apps/site/sample.ts`): the roll and the look's worlds through
`lookSheet` in `engine/ui/lesson.tsx`, the stops, the cards and the journal through `Overworld`, the
subject tiles through `placeArt`. What the sections downloaded fell from a 4.9 MB chunk (5.9 MB with
what it imported) to the index (223 KB) and the sheet's code (about 0.6 MB), and the page's first
script, the map's reach and the child's map are unchanged. `tools/__tests__/first-view.test.ts`
holds that nothing the site's page reaches is the notation's, the corpus's, the server's or the
scratchpad's, and that the JSON's journey is the sample child over the pack the page reads. The
printed lesson is the one picture that changed: it is the sheet as a child has it, drawn in the
printer's ink and clipped to a page's shape, since the root has no paginated sheet
(`apps/home/day.tsx` prints through the page's own print styles).

The root is one package, as the options below recommend. Whether it moves from npm to pnpm is still
open.

### The order from here

A move starts when every module it needs has moved, and when no other move is rewriting the same
files, since two scripts rewriting one file's imports at the same moment can lose one of the changes.
Each move deletes what it moved from the scratchpad in the same change, and lands only when the root's
`npm run check` and the scratchpad's checks pass.

1. `engine/ink/`: the pen and the surface a drawing emits onto, with `engine/ui/svg.ts` for the
   page. Moved, as above; the sheet waits for `parts/`, and the drawings move onto the surface as
   they move into `parts/`.
2. The data leaves the scratchpad, and the scratchpad becomes `.scratchpad/`. Done: what was the
   scratchpad's `content/` is `content/curriculum/` and its `art/` is `content/art/`, so the
   curriculum and the hand-drawn art stay tracked. The scratchpad was renamed `.scratchpad/`, which
   git ignores and the root's lint, format and guards skip. The root build and pack now use root
   modules only. Database seeds have been removed; local families are created through signup.
3. `engine/parts/`: every drawing, one file each in a folder for its family, and the catalogue. A
   family is the shelf a drawing is found on, so the owl in flight is
   `engine/parts/animals/owlflying.ts`, and its one declaration holds its settings with their
   ranges, its takes, its box, its description and its motion, for which its family's default
   stands in when it declares none. Three moves come first, one after another, because every later
   move imports what they build: the surface gains lettering, plain shapes and groups, so that no
   drawing builds SVG for itself; the drawing's contract, the catalogue, the animation module and
   its player move in; and the lettering in `src/art/paperkit.ts` moves with the props, marks and
   speech helpers that most drawings share. The rest moves by scratchpad file rather than by
   family, because 77 files hold the drawings of 28 families and a file that two agents rewrite at
   the same time can lose one of the changes. A drawing is rewritten onto the surface as it moves,
   and its move lands only when every take gives the same markup as the scratchpad's on screen and
   on paper, and the same pixels at question size, as a tile and in ink. Moves that share no
   scratchpad file are worked on at the same time and land one after another, since each of them
   changes the catalogue and the scratchpad's imports.

   The first two of the three have landed (14 September 2026). The first is described above. The
   second put the contract in `parts/drawing.ts` (`defineDrawing`: an id, a family, a title, a
   group, settings typed with their ranges, takes, a box in whole squares, `draw` onto any surface,
   `describe`, and an optional `motion` and `reads`), with the families' default motion, the reasons
   a drawing holds still and the setting names that hold a reading beside it. `parts/catalog.ts`
   holds the ordered ids and a loader for each, and imports nothing but the contract's types.
   `parts/shelf.ts` holds the shelves, the ideas and each moved drawing's grouping, and only the
   studio and search load it. The catalogue and the grouping stay empty until the first drawings
   move. The suites in `parts/__tests__/` check every drawing that arrives: the catalogue, the bar
   (which lists the 59 drawings below it with their reasons), the shelf and the contract's motion
   rules. `src/engine/animation.ts` moved unchanged to `motion/animation.ts`, with the module's own
   rules as its suite. The player moved to `ui/animate.ts` with its print stylesheet. It hands the
   browser a drawing's movement and each part's as keyframes from `keyframesOf` in
   `motion/animation.ts`, which the browser plays without the page's script ([animation.md](animation.md),
   "Performance"). It plays the motion a caller hands it rather than reading the shelf, so the scratchpad's pages play through
   `src/art/animate.ts`, which resolves each drawing on the scratchpad's shelf and hands the result
   on. `<Drawing>` is the Solid component in `ui/drawing.tsx`. `render` in `ui/svg.ts` hands a
   drawing on the contract the surface, and draws the shelf's drawings as before. The scratchpad's
   lists read what moved: `src/art/animation.ts` takes the defaults from `parts/drawing.ts`,
   `shelf-groups.ts` takes the shelves and the ideas from `parts/shelf.ts`, and `catalog.ts` puts a
   moved drawing on its shelf with `shelved`. All 3,214 renders of the 545 drawings gave the same
   markup, box, anchors and motion before and after. The third landed on 15 September 2026:
   `src/art/paperkit.ts` is `parts/lettering.ts`, and the props, marks and speech helpers most
   drawings share are `parts/props.ts`, `parts/marks.ts` and `parts/speech.ts`, each generic over
   the surface's group. The eleven drawings those files held moved with them onto the contract
   (`people/face.ts`, the props under `counting/`, `food/`, `money/`, `sport/` and `shapes/`, and
   `page/marks.ts`, `note.ts` and `bubble.ts`), so the catalogue and the grouping have their first
   lines. The scratchpad's drawing files, the sheet, the stage, the notation's parts, the lesson
   renderer and its pages import the helpers from the root, and the moved drawings reach the
   scratchpad through `src/art/moved.ts`, which gives each its old name as a visual and goes when the
   catalogue changes over. The pen exposes its surface as `ink`, and a drawing's context may leave
   `ink` out, so a context a page builds by hand keeps working, and a drawing on the contract keeps
   its own ids beside one drawn on the pen's surface, which `ui/svg.ts`'s suite holds. All 3,310
   renders of the 566 drawings gave the same markup, box and anchors before and after, and the
   eleven moved drawings the same pixels; the seven props now describe themselves, so they gained a
   screen-reader name. The bar's suite lists `bubble` as reaching past its box on purpose, for its
   tail. The first of the nineteen moves, the apps' own drawings, landed the same day: `icon` and
   `newbook` are `parts/apps/icon.ts` and `newbook.ts`, with their rules in `parts/apps/__tests__/`,
   and `src/art/icons.ts` and `moments.ts` are gone; every take gave the same markup and pixels, and
   the bar's suite lists `newbook` for its label's small caps, which predate the rule. The people
   followed: `person` and `umbrellas` are `parts/people/person.ts` and `umbrellas.ts`, the figure's
   construction and `placePerson` are `parts/people/figure.ts`, the first file on the catalogue
   suite's `SHARED` list, and the skin tones and hair colours are `SKIN` and `HAIR` in
   `engine/paper.ts` with their print greys (decision 1); `src/art/people.ts`, `umbrellas.ts` and
   `test/kit.test.ts` are gone, and `runners.ts` draws its figures from the root. Every take gave the
   same pixels; the umbrellas' markup differs only in how a placed figure's `translate` writes its
   numbers (two decimals before, the number itself now), which the compare confirmed by restoring the
   old format. The guides followed (15 September 2026): the six designs are `parts/guide/guide.bird.ts`
   and its siblings, each holding its design and the drawing `guideDrawing` makes of it (`guideBird`),
   the placeholder a lesson places is `guide.firefly.ts`, and the redrawn firefly the worlds name is
   `firefly.ts`, on the catalogue suite's `SHARED` list with the designs' contract `design.ts` and the
   kit `kit.ts`, since the placeholder holds its id on the shelf until the owner retires one of the
   two. The page's renderer is `engine/ui/guide.ts` (`renderGuide`, at any size, with boil), the
   surface's `shape` takes an opacity for the halo and the beam rough.js used to draw straight onto
   the page, and the pen gained `inkOutline` so the kit's pressure strokes reach nothing past the
   pen. A guide's idle is its family's motion played by `engine/ui/animate.ts`, or nothing: the CSS
   idle (`guide-motion.css`) is gone, every page that showed it plays the guide through the player
   instead (the seam's bar bird and roll guide, the world painter's `guideOf` on a group of its own
   until M5, the shelf's guides section), and the boil's rules moved from `boil.css` into
   `engine/ui/animate.css`, which the scratchpad's `drawing.css` imports. Every take gave the same
   pixels, box and anchors; the hand's idle and pointing markup differs only in its turn's number
   (`8.0` before, `8` now), confirmed by restoring the old format, and the guides section of the
   shelf drew every design at every size the same element for element. The bar's suite lists every
   guide as reaching past its box on purpose, for the marks round it, and the dot for the near-black
   its pupils print in. `src/art/guide.ts`, the ten files under `src/art/guides/` but `index.ts`,
   which now reads the designs from the root, and the two stylesheets are gone. The worlds' single
   pieces followed (15 September 2026): the fifteen drawings that each had a scratchpad file of their
   own are `parts/animals/albatross.ts`, `badger.ts`, `goat.ts`, `owlflying.ts`, `robin.ts` and
   `starlings.ts`, `parts/outdoors/hedge.ts`, `log.ts`, `shootingstar.ts` and `stile.ts`,
   `parts/places/lamppost.ts`, `parts/travel/cablecar.ts`, `railsignal.ts` and `shipwheel.ts`, and
   `parts/sport/runners.ts`, each carrying the motion its line in the scratchpad's list declared, and
   the reason a setting holds still (`STILL.setting`) moved to the contract with the stile. Every take
   gave the same markup byte for byte, the same box and anchors and the same motion, and the fifteen
   files are gone from `src/art/`; the worlds' list of drawings (`src/world/drawings.ts`) and the
   generated `src/world/shelf.ts` read them from the root. The bar's suite lists the badger, the hedge
   and the log as reaching a few units past their boxes, as they were drawn. The pieces of the nine
   worlds added on 14 September followed (15 September 2026), a twenty-first move filed after the
   inventory was run again, since their 21 single-drawing files belonged to no brief: the airship,
   the buoy, the mail boat, the seaplane and the yachts are under `parts/travel/`, the flamingos,
   the gannet, the parakeets, the puffins and the swallows under `parts/animals/`, the geyser, the
   giant flower, the salt lake, the salt pans and the tree platform under `parts/outdoors/`, the book
   house, the great clock, the lamp station and the printing press under `parts/places/`, the sea
   serpent under `parts/stories/` and the loose pages under `parts/writing/`, the first drawings on
   those two shelves. Every take gave the same markup byte for byte, box, anchors and motion; the 21
   files are gone from `src/art/`, and the generated `src/world/shelf.ts` reads them from the root.
   The bar's suite lists the salt lake's ripples and the tree platform's crown as reaching past their
   boxes.
   Stories and home followed (15 September 2026): the 44 drawings of `src/art/story.ts` and the five
   of `home.ts` are one file each under `parts/animals/`, `people/`, `food/`, `counting/`,
   `outdoors/`, `places/`, `travel/`, `stories/`, `page/` and `home/`, the last a new family folder
   for the balloons, the bubbles, the chest, the clothes line, the easel, the envelope, the exercise
   book, the lantern, the stamp, the swing and the tablet; the small pictures the stories draw with
   (the reading cast, the icons a story map and a stamp carry, a child's pinned pictures and their
   caption lines) are `parts/stories/pictures.ts` on the catalogue suite's `SHARED` list, `inside`
   joined `parts/props.ts`, the word a child reads for each marker (`MARKER_WORD`) is in
   `engine/paper.ts`, and the reason a clue picture holds still (`STILL.clues`) is on the contract.
   Every take gave the same pixels, box, anchors and motion, and the same markup at level normal but
   for the exercise book's label, whose size is a number on the surface (`26px` where the scratchpad
   wrote `26.0px`); the postmark's place name is lettering along a curve whose id the surface mints.
   The two files are gone, the labelled diagram and the postcard draw the cottage, the windmill and
   the story icons from the root, and the seam, the sign-in prototypes and `src/world/scenery.ts`
   take the stamps, the cottage, the door and the window through `src/art/moved.ts`. The bar's suite
   lists the basket, the boxes and the well as reaching past their boxes. A screenshot's hash was
   found to move with the machine's load (with the GPU, a busy machine rasterises the odd edge pixel
   differently, which is what the B5 and B6 compares under a load of 30 had shown), so `golden.mjs`
   now renders without the GPU, and `golden-ab.mjs` renders a move's old and new drawings in one
   page and compares them pixel for pixel, which confirmed this move and the screenshots B5 and B6
   still owed.
   Nature followed (16 September 2026): the 53 drawings of `src/art/nature.ts`, the largest file,
   are one each under `parts/animals/` (the creatures, from the ants to the whale),
   `parts/outdoors/` (the trees, the sky, the pond, the crops, the reef, the caves and the rest) and
   `parts/places/` (the bird hide), and the hand they share (a ring through points, lumps round an
   ellipse, a blade, a point along a direction, a clamp, an eye, a tapered stroke, a spline and a
   halo) is `parts/animals/nature.ts` on the catalogue suite's `SHARED` list, in the animals' folder
   since they draw with it most; the moon's disc is exported from `outdoors/moon.ts` for the day
   sky. A halo is a plain circle on the surface, and the reads a table makes that the root's
   strictness refuses take the neutral fallback the other drawings use. Every take gave the same
   markup byte for byte, box, anchors and motion, and the same pixels; the file is gone, the
   notation reaches the drawings through `src/art/moved.ts`, and the generated `src/world/shelf.ts`
   reads them from the root. The bar's suite lists the dolphins' wave and the fox's brush, facing
   left, as reaching a few units past their boxes.
   Travel followed (16 September 2026): the 31 drawings of `src/art/travel.ts` are one each under
   `parts/travel/` (25), `parts/places/` (the bridge, the jetty, the lighthouse, the station) and
   `parts/outdoors/` (the cloud, the tent), and the yard the shunting game is played in (a
   carriage's length, its rail, the siding's drop, the wheels and the coupling bar) is
   `parts/travel/yard.ts` on the catalogue suite's `SHARED` list, which the games' play test reads
   its three numbers from. Every take gave the same pixels, box, anchors and motion, and the same
   markup at level normal but for the map title's lettering, whose size is a number on the surface
   (`38px` where the scratchpad wrote `38.0px`), as the exercise book's was; the paper plane's
   markup differs at level raw only in the ids the surface mints. The file is gone, the notation,
   the brand page and the world poster reach the drawings through `src/art/moved.ts`, the seam
   imports the train from the root since M5, and `src/world/shelf.ts` is regenerated. The bar's
   suite lists the raining cloud's last drops and the banking paper plane's wing tip as reaching
   past their boxes. The games lead's three new files (`yardpieces.ts`, `rowing.ts`, `stream.ts`, fourteen
   drawings) are filed under the games' pieces move, with their hashes taken.
   Number followed (16 September 2026), the largest of the moves: the 68 drawings of
   `src/art/structures.ts`, `place.ts`, `compare.ts`, `fraction.ts`, `money.ts`, `algebra.ts`,
   `manipulatives.ts`, `numberball.ts`, `rulemachine.ts` and `grids.ts` are one each under
   `parts/counting/` (23), `parts/fractions/` (10), `parts/place/` (9), `parts/sums/` (8),
   `parts/money/` (7), `parts/puzzles/` (5), `parts/shapes/` (3), `parts/sport/` (2) and
   `parts/time/` (1), with new catalogue blocks for place, sums, puzzles, fractions and time in the
   order `FAMILIES` sets. Six files of construction the drawings share are on the catalogue suite's
   `SHARED` list: a number written on a fill with the white patch it takes on paper so no hatching
   crosses it (`counting/numonfill.ts`), the comparison signs drawn as strokes (`counting/sign.ts`),
   the columns of place value with the colour each place is coded in (`place/columns.ts`), the
   twelve-square bar every fraction drawing is built on (`fractions/bar.ts`), a value in cents
   written as a price and read back into cents (`money/price.ts`), and the function machine's parts
   (`sums/hopper.ts`). Seven drawings declare an interface for their params, since the lint refuses
   a cast inside them, and the five settings whose lists the scratchpad never declared (the Gattegno
   chart's pick, the digit cards' picked, the chain's signs, the order track's filled and the
   fraction wall's shade) are `fixed`, so the notation reaches no further than it did. Every take
   gave the same markup byte for byte, box, anchors, motion and pixels over 474 renders. The ten
   files are gone, the notation and the pages reach the drawings through `src/art/moved.ts`, and
   `src/world/shelf.ts` is regenerated. The bar's suite lists the bead string, the fan, the balance
   and the terms as reaching past their boxes.
   Shape and data followed (16 September 2026): the 31 drawings of `src/art/geometry.ts`,
   `chance.ts`, `charts.ts`, `grade4.ts` and `plotting.ts` are one each under `parts/shapes/` (13),
   `parts/data/` (13), `parts/sums/` (the area grid, the long division and the pyramid),
   `parts/counting/` (the tally) and `parts/people/` (the heads), and the blank a child fills in
   with the answer in pen when the key is on, with the pen it is written with at the size these sums
   write, is `parts/sums/blank.ts` on the catalogue suite's `SHARED` list, which the pyramid, the
   bus stop and the area grid draw with. Every take gave the same markup byte for byte, box,
   anchors, motion and pixels over 198 renders. The five files are gone, and the bar's suite lists
   the cube building, the coordinate grid and the plotted point as reaching past their boxes.
   Measures and time followed (16 September 2026): the 19 drawings of `src/art/capacity.ts`,
   `measure.ts` and `time.ts` are one each under `parts/time/` (9), `parts/measuring/` (8),
   `parts/money/` (the coins) and `parts/places/` (the clock tower), and the names of the days, a
   time read into minutes and a span of minutes written as hours and minutes are `parts/time/spans.ts`
   on the catalogue suite's `SHARED` list, which the calendar, the day strip, the schedule and the
   elapsed line share. Every take gave the same markup byte for byte, box, anchors, motion and
   pixels over 136 renders. The three files are gone, and no drawing of this move reaches past its
   box.
   Physical science followed (16 September 2026): the 34 drawings of `src/art/physics.ts`,
   `machines.ts`, `light.ts`, `vibration.ts`, `sky.ts` and `microscope.ts` are one each under
   `parts/science/`, a new family block before coding, and four files of shared construction are on
   the catalogue suite's `SHARED` list: the parts a circuit is built from (`science/wiring.ts`), a
   force arrow straight down onto a point with its size written beside it (`science/push.ts`), what
   the light drawings share, a ray with its arrow, a flat mirror, a torch, an eye seen from the side
   and a child's head in profile (`science/optics.ts`), and the rings of sound spreading from a
   point (`science/sound.ts`). The rules `src/physics/prove.ts` reads keep their export in the
   drawing file that holds them, so which swing is faster stays with the pendulum, the line of sight
   with how we see, and the phases and the day's arc with the moon and the sun's path. Every take
   gave the same markup byte for byte, box, anchors, motion and pixels over 198 renders. The six
   files are gone, and the bar's suite lists the circuit, the globe, the planets, the ramp, the rice
   drum and the series circuit as reaching past their boxes; the reasons the periscope and how we
   see sit below the bar now name `science/optics.ts` rather than the scratchpad's `light.ts`.
   Coding followed (17 September 2026): the 17 drawings of `src/art/coding.ts` are one each under
   `parts/coding/`, with the hand a program is drawn in, the grid a robot walks and what a coding item
   runs (`coding/listing.ts`, `grid.ts` and `setup.ts`) on the catalogue suite's `SHARED` list, and the
   drawings still run their `code` through `engine/coding.ts`. Every take gave the same markup byte for
   byte, box, anchors, motion and pixels over 100 renders; the file is gone, `src/coding/` takes the
   helpers from the root, and the bar's suite listed the maze, the turtle and the pixels for the greys
   their grid lines printed in, which the redraw of 17 September 2026 took off that list (the art
   shelf's batch 4.17: the cells take the palette's ink-soft on paper), and lists the blocks and the
   sorting cards as reaching past their boxes.
   Reading and writing followed (18 September 2026): the 40 drawings of `src/art/phonics.ts`,
   `texts.ts`, `writing.ts` and `subjects.ts` are one each under `parts/letters/` (13),
   `parts/writing/` (15) and `parts/stories/` (9), with the grid map, the labelled parts and the staff
   under `parts/travel/`, `parts/science/` and `parts/music/`, and the phonics glyphs, the card pairs, a
   story's rows and the ruled line (`letters/glyphs.ts`, `letters/pairs.ts`, `stories/rows.ts` and
   `writing/lines.ts`) on the catalogue suite's `SHARED` list. Every take gave the same markup byte for
   byte, box, anchors, motion and pixels over 208 renders, once the alphabet line's anchors had their
   name back: the converter that wrote the root side renamed the scratchpad's `letter` helper to `glyph`
   and caught the anchor key `letter(a)` with it, which the compare found as the move's only
   difference. The four files are gone, the notation, the scene renderer and five pages reach the
   drawings through `src/art/moved.ts`, `src/world/shelf.ts` is regenerated, and the bar's suite lists
   the passage as reaching past its box.
   Music followed (19 September 2026): the 20 drawings of `src/art/music.ts`, `strings.ts`,
   `mallets.ts`, `handdrum.ts`, `tunegrid.ts` and `countrow.ts` are one each under `parts/music/`,
   the five that are played (the piano, the fretboard, the glockenspiel, the hand drum and the tune
   grid) declared with `defineInstrument` and reaching the scratchpad's mount through `instrumentOf`
   in `src/art/moved.ts`, and the staff's hand, the fretted instruments' hand, the wood and the
   strings, and a whole instrument stood up (`music/clefs.ts`, `fretting.ts`, `luthier.ts` and
   `whole.ts`) are on the catalogue suite's `SHARED` list. The drum's two strokes, `DUM` and `TA`, are
   `engine/sound/voices.ts`'s, which `src/sound/hit.ts` re-exports. Sixteen drawings gave the same
   markup byte for byte, box, anchors, motion and pixels over 124 renders; the fretboard, the guitar,
   the ukulele and the lane clip with an id the surface mints per render, so their 28 renders gave the
   same markup with the ids renamed in order, and the same box, anchors and pixels. Two things were
   put right on the root side first: the converter had drawn a finger's number into the drawing's
   group rather than its own layer, so on a hidden layer the number showed (no child saw it, since
   the lesson sheets drew the scratchpad's fretboard until now), and the staff's `meter` is required
   at the root, so the four pages that left it out say 0, which the staff has always read a missing
   meter as. The six files are gone, the notation, the mounts, the eight music pages and the site
   reach the drawings through `src/art/moved.ts` and the root, and the bar's suite lists the drum, the
   fretboard, the hand and the hand drum as reaching past their boxes and the lane for its small
   lettering. The drawing tests in the scratchpad's `sound`, `strings`, `mallets` and `compose` suites
   now read the drawings from the root but still live in the scratchpad; moving them to
   `parts/music/__tests__/` is left to do.
   The hand-drawn files followed (20 September 2026): the 24 files in `content/art/` are drawings on the
   contract in `parts/imported/`, one file each named by its id (`svg.cat.ts`, `excalidraw.owl.ts`,
   `strokes.hills.ts`), listed in the catalogue under the family each is found on and also under the
   loader's name for it, `file:` and the file's own name, so the worlds and the children's pictures keep
   naming them as they did. The surface gained the one mark the move was designed round
   (`imported`): a hand-drawn file is written as the page wrote it before, element for element and
   attribute for attribute, rather than compiled into plain shapes, and the recorder keeps it as one
   mark. `tools/scripts/art.ts` parses the files into `parts/imported/files.ts` as it compiles them,
   since a drawing must draw without a browser's parser, and refuses an Excalidraw scene holding
   anything the drawing does not draw. How a file is read, sized, drawn and mirrored is
   `parts/imported/hand.ts` on the catalogue suite's `SHARED` list with `files.ts`: an SVG file is
   written as it is with its lines re-inked and its named fills coloured or hatched, an Excalidraw scene
   is drawn by the pen on each element's own seed, and a stroke file by the pen's pressure strokes.
   Every take gave the same markup byte for byte, box, anchors, motion and pixels over 96 renders; the
   96 differences the compare reports are each render gaining its accessible name, which a drawing on the
   contract carries and a scratchpad visual did not. `src/art/imports.ts`, `src/art/index.ts` and the
   three readers in `src/core/` are gone, the notation's asset information (`src/lang/assets.ts`) is read
   off the compiled files rather than a bundler's glob, and the pages, the scene renderer, the drawing
   pad and the world's fallback take a file's drawing from `src/art/moved.ts`. A drawing a page has
   loaded is now kept under its own id as well as the name it was loaded by, since a painter reads the
   id back off the page to find its motion (`engine/ui/drawings.ts`), which a hand-drawn file's motion
   needed and never had.
   The games' pieces followed (22 September 2026): the 56 drawings of `src/art/sports.ts`,
   `playfield.ts`, `yardpieces.ts`, `rowing.ts`, `stream.ts`, `games.ts`, `gamepieces.ts`,
   `dice.ts`, `action.ts`, `seesawprops.ts`, `river.ts`, `counter.ts`, `joindots.ts` and `dig.ts`
   are one file each under `parts/sport/` (17), `travel/` (11), `outdoors/` (7), `science/` and
   `measuring/` (4 each), `page/`, `animals/` and `food/` (3 each), and `data/`, `places/`, `money/`
   and `puzzles/` (one each), the geometry the games read (`ROAD_LANES`, `PEN`, `LIFTPIT` and the
   rest) exported from the drawing it belongs to; the dice's hand (`parts/sport/dice.ts`), the
   meadow's wash (`parts/outdoors/wash.ts`) and the join-the-dots layout (`parts/puzzles/dots.ts`,
   on the pen's `rng` in place of `seeded`, which `src/play/dots.ts` keeps the game's rules over and
   reads back) are on the catalogue suite's `SHARED` list. Every take gave the same markup byte for
   byte, box, anchors, motion and pixels; the 14 files are gone from `src/art/`, and the games'
   tests read the geometry from the root files. The bar's suite lists ten of them as reaching past
   their boxes as they were drawn (the rabbit's ears, the ground's and the sea's hatching, the
   road's and the dots' numbers, the railway's ballast, the boat's blade, the die's corners, the
   car's arrow and the pole's patch on paper).
   Food and the page followed (22 September 2026): the pizza, the chocolate bar, the box of eggs,
   the tray of buns, the measuring spoons, the recipe card, the mixing bowl, the ingredient pile,
   the worktop and the oven are `parts/food/pizza.ts` and its siblings, the stickers, the callout,
   the divider, the pinned card, the step dots and the choice cards are under `parts/page/`, and the
   pattern strip is `parts/puzzles/pattern.ts`; the choice's and the pattern's `text` calls became
   `letter`, and the recipe and the oven carry the motion their lines in the scratchpad's list
   declared, the oven as a reading. Every take gave the same markup byte for byte, box, anchors,
   motion and pixels; `src/art/kitchen.ts`, `oven.ts`, `worktop.ts`, `furniture.ts` and `choice.ts`
   are gone. The bar's suite lists the stickers, whose box is sized for the words Well done, and the
   choice's loop round the chosen card as reaching past their boxes.
   Painting followed (22 September 2026): the 24 drawings of `src/art/painting.ts` are
   `parts/art/paintbox.ts` and its siblings, and its other exports (the print blocks' shapes and the
   motif drawn from one, the shine and the puddle, the tools' kinds, the tint ladder's recipe, the
   paint sheet's guides and printed lines, the mirror halves, the one-line figures and the cut-paper
   pictures) are `parts/art/kit.ts`, on the catalogue suite's `SHARED` list, while `colourOf` and
   `paintFill` are read from `engine/pigment.ts`, where the chemistry move put them; the surface's
   plain path gained `turn`, since the collage lays a piece's shadow by a translate and a scale that
   `shift` could not say. Every take gave the same pixels, box, anchors and motion, and every take
   but one the same markup byte for byte: the sheet's mirror half is clipped by the surface, which
   writes its `clipPath` without the `<defs>` the old file wrapped it in, and the A/B confirmed the
   pixels. The bar's suite lists the colour wheel's warm and cool labels and the mirror block's name
   as 10 units, which predate the rule, and the tools in a jar, the palette, the rubbing's first
   leaf and the sun print's first fern as reaching past their boxes, as they were drawn.
   `src/art/painting.ts` is gone, and the tint and mirror tests are
   `parts/art/__tests__/kit.test.ts`.
   Chemistry followed (22 September 2026): the 30 drawings of `src/art/chemistry.ts` are one each
   under `parts/science/`, and two files of shared construction are on the catalogue suite's
   `SHARED` list: the tables the drawings are drawn from and the chemistry checker marks by
   (`science/substances.ts`), and the hand the glassware and the pictures of a change share, the
   liquid in a glass, its gleam, a bubble, a paint-box fill, a lettered tag, a crystal, an ice cube,
   a nail, a candle, the pieces of a mixture and an atom as a ball (`science/apparatus.ts`). The
   paint-box colour a setting names and its family's hatch on paper (`colourOf`, `paintFill`) moved
   from `src/art/painting.ts` into `engine/pigment.ts`, typed on what they read of a context rather
   than on `engine/ink`, which `pigment` may not reach. Every take gave the same box, anchors,
   motion and pixels over 224 renders and the same markup with attributes sorted; 60 renders on
   screen differ raw only in the order of a white gleam's attributes, which the surface writes fill
   first. `chemistry.ts` is gone, the four tests of its tables are
   `parts/science/__tests__/substances.test.ts`, and the bar's suite lists the flask, the fossil
   steps, the mixture, the nails, the safety kit and the water cycle as reaching a few units past
   their boxes, as they were drawn.
   E1 landed on 22 September 2026: `engine/parts/catalog.ts` is the one list of drawings, the loader
   (`engine/ui/drawings.ts`) reads it alone with no fallback, and the scratchpad's lists and
   adapters (`src/art/moved.ts`, `animation.ts`, `animation-moved.ts`, `shelf-groups.ts`,
   `src/world/shelf.ts` and `scripts/world-shelf.mjs`) are deleted; `src/art/catalog.ts` derives its
   shelf from the root's catalogue and placements until the shelf page moves to `apps/studio`, and
   `src/art/animate.ts` plays `motionOf`. The SVG `part` went with its last user, but the SVG
   `Visual`, `defineVisual` and `pen.rc` stay in `ui/svg.ts` and `ink/pen.ts`: `engine/ui/scene.ts`
   declares its row of props with `defineVisual`, and `engine/ui/map.ts` and `scenery.ts` still take
   a shape's group through `pen.rc`.
   The fourth move, the pure sound, landed on 16 September 2026: `src/sound/pitch.ts`, `scale.ts`,
   `keys.ts`, `beat.ts` and `fretted.ts` are `engine/sound/` one for one, `Note` declared in `pitch.ts` and
   `Key` in `keys.ts` (the scratchpad's `types.ts` re-exports both until the rest of the sound model
   moves), the reads the root's strictness refuses given a fallback the read cannot reach (a pitch
   class, a letter, a regex group the match guarantees) and the string spreads written as
   `Array.from`, so nothing sounds or reads differently; the fifteen cases that test only those
   five files are `engine/sound/__tests__/sound.test.ts`, and the scratchpad's `test/sound.test.ts`
   keeps the fifty-three on the voices, the sounder, the judge and the instruments. Every importer
   in the scratchpad (the four music drawings, the pages, the checkers, the runner and the rest of
   `src/sound/`) reads the five from the root, and the five scratchpad files are gone. For the music
   drawings the contract gained its one extension (16 September 2026): an `Instrument<P>` is a
   `Drawing<P>` that is played, declaring `keys(p)` (where each key is, its note, its anchor and
   its hit rectangle) and the `voice` it plays with, with `defineInstrument` beside `defineDrawing`
   and the catalogue listing it as a drawing; the nine voice names are data in
   `engine/sound/voices.ts` (the voices' definitions stay with the sounder until the sound model
   moves, and the scratchpad's `types.ts` re-exports the names), so the mount and the drawings share
   one union, and the parts' suites hold that every instrument's keys lie inside its box and that its
   voice is a name the list has. The hand-drawn files are compiled by `tools/scripts/art.ts` into `parts/imported/files.ts`,
   which Node, the tests, print and the apps all read in place of Vite's glob, and a test fails
   while it is out of date; the readers change over to it when the imported drawings move.
   `engine/parts/brand.ts`, the logo, is there already.

   The drawings then move in nineteen moves: the apps' drawings, people, the guides, the imported
   files and the pieces of the worlds; stories and home, nature, travel, number, shape and data,
   measures, the games' pieces, food and the page, and physical science; and reading and writing,
   painting, chemistry, music and coding. `.scratchpad/scripts/golden.mjs` takes the hashes of every
   take before a move and compares against them after it. When the last has landed, the catalogue
   changes over to `parts/catalog.ts`, and the scratchpad's lists, the old `Visual` and `pen.rc` are
   deleted. Then the pen copies the points it hands rough.js, whose hachure turns a polygon's points
   in place, and the hashes are taken again, since that changes what some drawings draw.

   Five decisions shape the moves (14 September 2026). Skin and hair are value tables, `SKIN` and
   `HAIR`, with their print greys, in `engine/paper.ts` beside `PALETTE`, landing with the people;
   they go into `palette.css` only when a stylesheet reads them. Every drawing declares `describe`,
   which returns 15 to 30 words or null, with no em-dash and no exclamation mark, and the same words
   whatever a setting that carries a reading is set to; each move writes the descriptions of its
   drawings. The 59 drawings below the bar in [shelf.md](shelf.md) move as they are, each listed
   with its reason in the bar's suite, and are redrawn later as changes of their own. The fifth
   was revised on 16 September 2026: it had a coding drawing take the result of a program (the path,
   the positions) as its settings, with the lesson running the program and the interpreter moving
   later with the lessons; but the notation derives the coding items' settings from the drawings'
   params, so the result as params would have changed those settings and medium's variant keys, and
   the interpreter is a dependency of the drawings rather than of the lessons. So the program model
   and its interpreter are `engine/coding.ts`, a module of its own that `parts` may reach, with its
   tests in `engine/__tests__/`, and the fourteen coding drawings that run a program keep their
   `code` and `moves` settings and run it as they did (moved 16 September 2026: the scratchpad's
   `src/coding/*.ts` and the coding drawings import it from the root, and `src/coding/program.ts` is
   gone; the prover's own checks stay in `.scratchpad/test/coding.test.ts`). The paint mixing in
   `src/paint/mix.ts` moves to `engine/pigment.ts`, which `parts` may reach, and the Paint tab
   imports it from there (moved 16 September 2026: the reads its tables make by band and by channel
   carry a zero the root's strictness asks for and they never reach, so every mix is the same
   colour; the five cases that test only the mixing are `engine/__tests__/pigment.test.ts`, the
   scratchpad's `test/paint.test.ts` keeps the ten on the surface, the verifier and the drawings,
   the Paint tab, the painting drawing, the verifier's provers and the chemistry test read it from
   the root, and `src/paint/mix.ts` is gone). The owner decided on 16 September 2026 which of the 49
   drawings that nothing used stay on the shelf: the rocket, the peg board and the crane stay as
   covers of the removed games, and twelve were dropped on 19 September 2026 (the pen's marks, the
   landing pad, the ground of the Moon and Mars, the height mast, the tube lid, the ball dropper, the
   crane's hook, the plank, the rosette, the ribbon, the brace and the Excalidraw house) with their
   catalogue, grouping, animation and bar-suite lines, `engine/parts/page/marks.ts` and
   `content/art/excalidraw/house.excalidraw`; the thirteen drawings that share their files drew the
   same markup, box, anchors and pixels before and after, and what becomes of the rest of the 49 is
   the plan in [shelf-usage.md](shelf-usage.md). Two more decisions came
   with the briefs for the nineteen moves (14 September 2026). A hand-drawn file is one mark on the
   surface that holds the parsed file, which the SVG surface writes as `importNode` writes it today
   and the recorder keeps as one mark, so the files stay authored art rather than being compiled
   into plain shapes, and each imported drawing is a contract drawing in `parts/imported/` whose
   `draw` makes that mark. A file of construction that several drawings share, such as the person's
   figure, is not a drawing: the catalogue's suite holds every file in a family folder to a line in
   the catalogue, and skips what a `SHARED` list names with its reason; a helper one drawing uses
   stays in that drawing's file, and one that two families share goes in the folder of the family
   that uses it most.
4. `school/worlds/`: the worlds, the terrain, the overworld map, and the world a page draws behind
   its cards. The scratchpad's `src/world/` is split along the lines this move needs. The model is
   pure data and pure functions and has moved to `school/worlds/` (15 September 2026): each world's
   declaration, which carries its map composition and its site, `worlds.ts`, `check.ts`,
   `choice.ts`, `roll.ts`, `rewards.ts`, `geography.ts`, `overworld.ts`, `terrain.ts`, `life.ts`,
   `places.ts`, `view.ts` and `lessons.ts`, which reads what a lesson holds through a
   `Corpus` built from the pack's index (`corpusFrom`), or in the scratchpad from the workspace
   (`corpusOf` in `src/family/pack.ts`). The shapes a page draws from went to `engine/space.ts`,
   since `engine/ui` may not import `school/`: the drawn half of a world's declaration
   (`WorldPicture`), the map laid out (`Overworld`), the ground (`Terrain`, `MapReach`, `Land`), the
   roll's layout, and the two views a page is given, `MapView` and `WorldView`, each with the limits
   its viewer passes (`MapLimits`, `WorldLimits`); `school/worlds/view.ts` builds them, and its
   suite holds that a child's view never carries a place past the paper's edge with a button or a
   name, and that a view that records nothing has no kid to record for. `flight.ts` and
   `motion.ts` (what a world plays, with the shelf's declared motions passed in and no page in it)
   went on to `engine/motion/plane.ts` and `engine/motion/world.ts`, since only a page runs them.
   The scratchpad keeps `src/world/view.ts` for the sample child's record and the worlds to come,
   `src/world/motion.ts` as the binding of the model to the shelf's declared motions, and the
   painters, which touch the page and go to `engine/ui/`: `paint.ts`, `map.ts`, `fly.ts`,
   `scenery.ts` and `player.ts`, the page half of motion. A painter in `engine/ui/` may not import
   `school/worlds/`, so it reads only the view it is given, which carries every drawing's ref, the
   country's life, the rides, the years and the landings beside the places and ways, and the pure
   queries a painter calls over the shapes are in `engine/space.ts` beside them (whether a point is
   wet, known or reached, the washes, the sky palette, the limits, `PLACE_GROW`, `BLEED`, `FADE`
   and `walkedCrop`). The painters read only the view now (15 September 2026): `paintTerrain` and
   `paintMap` take a `MapView`, `paintStretch` and `sceneryPieces` a `WorldView`, and the seam's
   `paintMapView` and `paintWorldView` hand the view straight on, with no journey rebuilt from it.
   What that took from the model went onto the view or into `engine/`: a place carries the day each
   landmark was lit and, for a grown-up, when its world stands; a stretch carries the guide's line
   and the drawing the weather brings; the reach's frontier carries what grows with the share of the
   child's world finished, so `reachAt` in `engine/space.ts` rebuilds the reach at any share for the
   colour washing out as the map opens, and `reachOf` no longer takes one; a colour washed over
   paper is `washed` in `engine/paper.ts`; and the CSS a life's round is written as moved into the
   painter. `worldViewOf` builds through `rollViewOf`, the half from a laid-out roll to a view, which
   a page whose days are its own builds through too, and a view is data: `mapViewOf` takes a journey
   already worked out for a backdrop's map with nobody on it. The scratchpad's pages bind the two
   through `src/world/refs.ts` (a drawing by its art id, and a window's view from a journey). The
   drawings a world names are the shelf's and go to `engine/parts/` in step 3; `art.ts` names them
   by id and holds none. Until the catalogue changes over, the painters read them from
   `src/world/shelf.ts`, which `scripts/world-shelf.mjs` writes from the catalogue's imports and a
   test holds current, so the map's code carries the worlds' drawings and never the whole shelf.
   The loader is in place (16 September 2026): `engine/ui/drawings.ts` loads each ref a page's worlds
   name (`refsOf` in `school/worlds/art.ts`) once, through the catalogue where the drawing has moved
   in and through one seam export, `visual(ref)`, where it has not, and `sizeOn` in `art.ts` turns
   what it loaded into the `size` the view builders take; the children's view and the pages' grounds
   build their views from it, with the same sizes as the painters compute (210 of 210 entries), and
   each art move shrinks the fallback without touching them. The painters followed (16 September
   2026): `src/world/map.ts` and `src/pages/map-life.ts` are `engine/ui/map.ts` (the country, the
   places and ways, and the drawings that travel the country as keyframes), `src/world/paint.ts` is
   `engine/ui/scenery.ts` (the world round the roll, and `paintWorldView`), `src/world/player.ts`
   is `engine/ui/player.ts`, and the seam's `paintMapView` and `paintWorldView` went with them,
   with their stylesheets: the roll's rules of `journal.css` into `engine/ui/world.css` and the
   map's, with the scratchpad's `overworld.css`, into `engine/ui/overworld.css`, so the Worlds tab
   keeps only its own. The painters read a drawing from what the page loaded (`drawingOf`), its
   declared motion from `declaredOf` and how the shelf plays it from `playsOf`, so a drawing the
   seam falls back to comes with both; the guides' designs and the bar's bird are
   `engine/ui/guide.ts`'s; the children's stamps and the postcard's drawings draw through the
   loader (`engine/ui/art.tsx`, with the creatures in `pictures.ts`); `sampled` and `windAt` are
   `engine/space.ts`'s; and `src/world/shelf.ts` now lists only the drawings the catalogue does
   not hold, from their scratchpad files, so the seam reaches no moved drawing statically and each
   move shrinks it. The scratchpad's pages that still draw a world import the painters from the
   root, and load the worlds' drawings first (`loadWorlds` in `src/world/refs.ts`); `src/world/scenery.ts`
   went, since the door and the window are the catalogue's. What those pages placed through the
   seam's file (a world behind a page's cards, a creature, a drawing by name, a world in a box) is
   `src/world/placed.ts`, the scratchpad's alone, so the seam holds only what the root still takes:
   `sample`, `drawSample`, `openingDrawn`, `sampleMapView`, `sampleStops`, `sampleRoll` (the site's
   sample child, until the site is rebuilt), `visual` (the loader's fallback, until the last art
   move) and `scenes` (the pack's scenes on a sheet, until the lesson side moves). The loader names
   a hand-drawn file apart from a coded drawing (`artKey` in `engine/space.ts`, `file:` and the file
   name), since the worlds name both by the same word (the harbour's sailing boat, and the shelf's
   boat to load).
   The world's motion followed (17 September 2026): every drawing a world or the country places
   plays its own declaration through `engine/ui/animate.ts`, on a group the page owns that carries
   the camera's zoom for the size rule, so the float, the flags, the tail and a coded drawing's
   parts are the player's and `engine/ui/player.ts` keeps only what a world draws beyond the
   drawing (the puff, the water's flow, a tap's answer, a moment's light, the day's events and the
   rare sights). The `mo-*` idle rules of `engine/ui/world.css` and the scratchpad's `journal.css`
   went with them, and so did the stage's one amplitude, the player's own watch on what is off
   screen (the map keeps one for its travellers) and the map's five second wake, which is the
   group's settle policy now. [animation.md](animation.md) has the steps and
   [motion.md](motion.md) the rules.
   The world as a place followed (19 September 2026), once the owner chose form C of the
   scratchpad's `world-map.html`: zoomed out, a world's term is a trail through its land with a stop
   for each day, which hands over to the roll close in. The model is `school/worlds/trail.ts`: the
   term's days, the next one closed and the rest kept back (`slotsOf`, reading `dayGroups` in
   `roll.ts`, which `daysOf` groups by too), the trail laid out once for the whole term with each
   stop placed by the day's number and never by a sheet's height (`layoutTrail`), and a day said as
   a child says it (`dayInWords`). The shapes are in `engine/space.ts` beside the roll's (`Stop`,
   `TrailLayout`, whose `land` is the place as a stretch of a roll with no column, so the painters
   draw it as they draw a stretch, and `StopView` and `TrailView`), with `TILE`, which the painter's
   tiles and the trail's runs share, and the camera's queries a page makes over a place (`keepIn`,
   `pointerTo`, `stopNear`). `worldViewOf` gives a view the term it opens on as `trail`, built by
   `trailViewOf` in `view.ts`, and a world may name the creature in its finished days' stamp
   (`stamp`, the meadow's hen; the first of its creatures otherwise). The place is drawn by
   `engine/ui/place.tsx` with `place.css`, loaded the first time a child steps back from the roll, as
   the roll's own component is: it paints the world round the trail with the roll's painter
   (`paintStretch` and `sceneryPieces` over the trail's `land`) and draws the trail's own on top, the
   plates, each day's paper with the postcard that stands in it until the paper lands, the stamp, the
   marker for the day still to come and the guide's token. The whole prototype is gone from the
   scratchpad with it: `world-map*.ts`, its stylesheet, its page and its build entry.
   The model imports the year a roll lays out, a lesson's facts as the pack's index holds them, and
   the geometry of points and rectangles, so the `worlds` entry in `boundaries.ts` has `year`,
   `pack` and `space` in its reach, beside what it had before the model moved.
5. The apps drawn on those modules. The Solid foundation, the components `apps/home` and
   `apps/kids` share in `engine/ui/`, routes loaded when they are opened, one entry per app, the
   sign-in screens and `tools/e2e/` with the journey (sign up, add a child, open the child's view,
   leave it with the family PIN) came forward ahead of this step, and `engine/ui/chrome.ts` is gone.
   The child's map came forward too (15 September 2026): `engine/ui/overworld.tsx` draws a `MapView`
   with the limits its page passes, on `engine/ui/view.ts`, the canvas view that was
   `src/space/view.ts`, and paints the drawings through one more seam export, `paintMapView`, until
   the painters move; `apps/kids/map.tsx` builds the child's view from their record and the pack and
   is the child's page, and the site's map section draws the sample child's stops through the same
   component. The world followed (15 September 2026): `engine/ui/world.tsx` draws a `WorldView`,
   arriving from a term's horizon and coming down the roll to today, with the sheets as the page's
   own and every drawing played through `engine/ui/animate.ts`; the seam paints the roll with
   `paintWorldView`, and the site's roll picture is the same component with the sample child's
   sheets. The roll's zoom levels (`rollLevelOf`, `labelGrow`) are in `engine/space.ts`, as the
   map's are. The backdrops followed (16 September 2026): `engine/ui/backdrop.tsx` keeps the
   snapshot first and draws the live map behind a page's cards and the site's opening with
   `Overworld`, which gained `aim` (the camera an aim asks for is `aimCamera` in
   `engine/ui/snapshot.ts`, which the still picture's placing takes too, so the two cannot drift),
   `hud` off (the host is inert, with no buttons and no words), `steps` (the first frame painted in
   short tasks while the snapshot shows), `life` (the drawings that travel the country, through the
   seam's `paintMapView` until M5) and `play`. The country's view is `countryViewOf` in
   `school/worlds/view.ts`, which each app hands its page, since `engine/ui` may not import
   `school/`, and the sample child's is `viewOfTrip` in `school/worlds/sample.ts` over the journey
   in the site's data, since a `MapView` is about 1.1 MB as JSON against the data's budget of 25,000
   bytes. The site draws on the moved modules since 22 September 2026, and `engine/ui/shelf.d.ts`,
   `engine/ui/seam.ts`, the alias and `.scratchpad/src/bridge/` are gone.
   The place and the gestures that move between the views followed (19 September 2026). A child's
   view now has three screens rather than two, held by `apps/kids/child.tsx`: the map, the place a
   world is seen as (`engine/ui/place.tsx`) and the roll (`engine/ui/world.tsx`). Each hands the next
   a rectangle, so going in and coming out is one movement, as the map's dive already was, and every
   handover is a cut under reduced motion. Nothing is laid over any of them: the buttons that went
   are Go in and the map's zoom pair, and the roll's The map, Today and its zoom pair. Tapping a
   world on the map, or pinching into it, goes in; pulling back out of the roll reaches the place,
   and out of the place the map; Enter goes in, Escape comes out one step at a time, the plus and
   minus keys zoom (`engine/ui/view.ts`, which now gives its host the keyboard), and a hidden button
   in the roll and in the place, shown when it takes the focus, is the way out for a reader. A
   finished day's paper on the place is the day's own sheet, drawn through the same door the roll
   asks through (`lookBack`, and `pastSheet` in `apps/kids/lesson.tsx`): each view names every day
   near the camera, and the page keeps those drawn and lets the rest go, holding each sheet's
   measured height for ever so the roll never lays out again under the child.
6. The lesson side: `scene.ts`, `pack.ts`, `engine/notation/`, `school/lessons.ts`, `school/year.ts`
   and `school/record/`, which the site's lesson and the apps' journals need. `engine/pack.ts` came
   forward for the child's view (14 September 2026), with the concrete scene's shapes in
   `engine/scene.ts`, which is why `pack` reaches `scene`; `tools/pack.ts` builds a pack through
   `.scratchpad/scripts/pack-work.ts` until `engine/notation/` moves in. `school/lessons.ts`
   followed: it checks a pack question's typed or arranged answer against its answers and feedback
   rules at the level a sitting began with, runs the tries and the hint ladder, and writes what a
   sitting records, and the scratchpad's lesson page checks through it. The fold of a kid's log came
   forward too: sittings, attempts, printed sheets, marks and the days they fall on are in
   `school/record/record.ts`, since `record` may not reach `family`, and the plan with a kid's tracks
   and planned days is in `school/family/family.ts`. `school/year.ts` followed (15 September 2026):
   a year read off a pack's lesson facts, its path and side paths, prerequisites, states and
   summaries, and a kid's progress through it, with the progress record and `mastery` in
   `school/record/record.ts`, which `year` reaches. `src/space/journey.ts`, `years.ts` and `grade1.ts`
   are gone, and the `Sketch` stand-in pictures with them. `src/space/layout.ts` stayed with
   `journey.html`, since it was that page's geometry rather than the year, and was deleted with it,
   and `src/space/progress.ts` stays as the sample child's made-up record until `record/fixtures/`
   takes it. On the same day the
   server gained `server/pack.ts`, which reads the pack `npm run pack` wrote and serves its lessons
   under a session, and `GET /api/kid/:kid/record`, a child's record folded on the way out with
   `childRecord` in `school/family/family.ts`, so `server` reaches `year` and `engine/ui` reaches
   `pack` ([api.md](api.md), "A child's view"). Today's lesson on the child's roll followed (15
   September 2026): `engine/ui/lesson.tsx` draws a pack lesson at a level on a sheet, with what the
   viewer may do as its limits (a child answering, or a grown-up reading with the key), and
   `apps/kids/lesson.tsx` runs the sitting through `school/lessons.ts` and the child's queue;
   the sheet's scenes are drawn by one more seam export, `scenes`, which hands the scratchpad's
   renderer a scene the pack laid out and goes with `engine/notation/` in this step. The world
   answers what the day did (child plan move 8, 15 September 2026): once a finished sheet's sitting
   has been sent, `apps/kids/child.tsx` reads the record again and draws the roll and the map from
   it, the roll keeping its camera and every sheet as the child left it, and the seam's
   `paintWorldView` plays that day's doings from the `on` and `joined` the view now carries; a
   screen sitting begun on another visit and not ended is picked up where it stood, read off that
   lesson's own events (`turnsOf` in `school/lessons.ts`), and the roll lands at its first
   question still to do. The other answers followed (child plan move 9, 16 September 2026): an
   answer arranged on the drawing, the weights on a see-saw plank or the cuts along a cake, is
   `engine/ui/arrange.tsx` on the sheet, judged through `checkArranged` over the boards of
   `engine/arrange.ts`, which moved from `src/lang/arrange.ts` as a module of its own since the
   verifier, the renderer and the page all read it and `lessons` may not reach `motion`; a sitting
   picked up again shows what the child gave last, typed or arranged. A piece a grown-up looks at
   (`writing.by-eye`, and `art.by-eye` until the easel moves) is made on paper and handed in from
   the sheet, which records it as collected for the grown-up, and a picked answer is pressed however
   long its words (17 September 2026). A program a `coding.builds` check marks is built on the sheet
   from its pad's blocks (`engine/ui/program.tsx`, with the pad's rules in `engine/ui/blocks.ts`),
   played a step at a time on its drawing, and checked with `done` in `engine/coding.ts`, which the
   verifier proves the task with, so `ui` reaches `coding`.
   The notation followed (22 September 2026): `engine/notation/` holds `notation.ts` (what were
   `syntax.ts`, `levels.ts`, `check.ts` and `workspace.ts`), `vocabulary.ts` (`registry.ts`,
   `parts.ts` and `assets.ts`, with every part read off `parts/catalog.ts` rather than named by
   hand: 531 parts, 580 node types), `instantiate.ts` (`instantiate.ts`, `templates.ts` and
   `layout.ts`, with `wrap` and `pyramidRows` in `engine/scene.ts` beside `paramsOf`), `lessons.ts`,
   `verify.ts` (`verify.ts` and `checkers.ts`) with one file per subject's checkers (`physics.ts`,
   `coding.ts`, `paint.ts`, `chemistry.ts`), and `compile.ts`; the pure judge of a performance came
   first as `engine/sound/judge.ts`, declaring its own `Performance` and `Struck` since `sound` may
   not reach `answer`. `scene-render.ts` is `engine/ui/scene.ts`, which draws a pack's laid-out
   scene from the catalogue and is what the home and kids apps call where they called the seam's
   `scenes()`, each now loading its lesson's drawings before it draws. `tools/pack.ts` compiles in
   process, and the pack it writes is byte for byte the one `pack-work.ts` wrote; `lesson-render.ts`
   stays in the scratchpad for its pages until they move. The question `expr.ts` left open, where
   `fill` and the nouns go, took neither of its options: nothing at run time fills a noun, so the
   filler is in `notation/instantiate.ts` and `NOUNS` in `vocabulary.ts`. `notation`'s reach gained
   `paper`, `coding` and `pigment`.
7. `apps/site/`: Site M as a Solid app is in place ahead of its turn, at `/` for a visitor who is
   signed out and at `/home` for everyone. Its words and pictures came through the seam until
   22 September 2026, when the sample child moved to `school/worlds/sample.ts` and the site's data
   and visitor pack are written at build (above). What is left is prerendering it, and the Node
   server serving the built apps on the same paths in production.
8. `sound/`, `assistant/` and `studio`, after which `.scratchpad/` is deleted. `games/` moved on
   22 September 2026: its model, mechanics, bindings, prover and record are in `school/games/`, and
   the stage and field are `engine/ui/stage.ts`. The Games tab remains a scratchpad prototype until
   the children's game screen is built.

## The constraints

Five come from the owner. The first is not one among equals: where two of these pull against each
other, simplicity decides.

Simplicity. Fewer things, named for what they are, with as little ceremony between a reader and the
code as we can manage.

One long file per concept, rather than many small file splits. This is the constraint that changes
the trees most, and it cuts against what the repository does now.

A mix of a domain breakdown and a technical one. Modules named after what a family would say
(lessons, games, music, the parent's side) beside modules named after what has no domain (the paper,
the pen, the notation, the store), rather than a tree that is all one or all the other.

No drawer called `features`, and no drawer whose only content is a category.

A better answer for the backend than `services/`, which is tolerated and not liked.

Two are firm from the first round. There is no root level `src/`, and modules sit at the root of the
repository. Whether a module carries a `src/` of its own follows the packaging decision rather than
preceding it, and that question is answered once below rather than per option.

One comes from the work: the shape has to be adaptable soon, so the recommendation states its first
migration step and what can wait.

## The three rules the structure exists to enforce

These survive from the first round with their evidence, and two of them have gained a clause since it
was written.

One declaration per drawable thing. A part, meaning a ten frame, a ruler, a balance or a table,
declares its settings, its anchors, its box in squares, its capacity and how it draws, all in one
file, and everything else reads that declaration. The vocabulary the notation checks against is
assembled from the parts index rather than maintained beside it. The evidence that this works is now
measured twice: [tracks.md](tracks.md) reports that its fifteen new drawings cost "fifteen files and
two import lines", with no hand-written registry entry, layout case or renderer case, and
[sound.md](sound.md) reports that two of its four new parts needed a hand-written registry entry
because their anchor names depend on their values. The evidence that it is not true yet is in the
tree: the same size formula is written twice, at `src/art/structures.ts:221` and again in `sizeOf` in
`src/lang/layout.ts`, and fixed boxes are written twice as well. The clause this rule has gained is
that it now covers mechanics as well as parts: [activities.md](activities.md) asks that a mechanic's
settings come from the mechanic's own declaration "the way a part's settings come from the part's
declaration, so the checker, the studio's forms, the prover and a generator all read one source".

Drawings target a surface, not a document. A draw function receives a surface and emits strokes onto
it. The browser passes an SVG surface, a test passes a recorder, and the server passes a PDF surface.
In the scratchpad the draw functions build SVG elements directly, which is why nine drawings added in
one sitting could not be tested and had to be checked by eye, and why two of them were wrong. The
clause this rule has gained is sound: `src/sound/web.ts` is already the only file in its folder that
mentions Web Audio, because a sound targets a sounder rather than an `AudioContext`, so the same
discipline now covers two kinds of output rather than one.

Content compiles to a pack, so a runtime never contains the compiler. The notation stays the source
of truth. A build step checks it, verifies every version and writes a pack; the apps read the pack.
Nobody authors a pack, so this does not reopen the question settled in
[notation-vs-json.md](notation-vs-json.md). The measurement behind the rule is that the marketing
page in the scratchpad ships the parser, the checker, the verifier and the whole corpus, 161 kB of
JavaScript, to draw one hero. [ai.md](ai.md) turns the rule into the reason all generation sits
upstream of the pack: "The child's device cannot run either gate, because `features/authoring` is
author time code and `apps/kids` may not contain it, which `check:runtime` enforces."

## What we measured

The scratchpad as it stands. The content counts moved three times while this was being written, so
the Tmp page in the scratchpad derives them from the corpus glob rather than repeating them; read
them there if the difference matters.

| What | Measured |
|---|---|
| TypeScript and CSS under `src/` | 183 files, 38,660 lines, in ten folders |
| The machinery, meaning everything outside the drawings, the pages and the stylesheets | 98 files, 16,524 lines, so 169 lines a file on average |
| Largest folders | `src/art/` 49 files and 11,359 lines, `src/pages/` 19 files and 8,198 lines, `src/lang/` 16 files and 3,542 lines |
| Longest file | `src/art/catalog.ts` at 1,225 lines, which is the catalogue and is one concept |
| Drawn parts | 214 `defineVisual` declarations in 49 files, so 4.4 concepts a file |
| Mechanics | 10, in 10 files, one each |
| Content | 382 `.lumi` files, 8,859 lines: 239 items, 142 lessons, 1 component |
| Hand-drawn art | 25 files: 17 svg, 4 excalidraw, 4 strokes |
| Page entries | 14 `.html` files at the root of the scratchpad |
| Tests | one tree, `test/`, 16 files and 3,673 lines, 229 assertions |
| Guards | three, in `scripts/`: `check-art.mjs`, `check-print.mjs`, `check-privacy.mjs` |

One measurement matters more than the rest, because it is the owner's complaint expressed as a
number. Following a lesson from its text to its drawing today passes through eight files in
`src/lang/`: `syntax.ts` parses it, `check.ts` validates it, `registry.ts` and `parts.ts` supply the
vocabulary, `verify.ts` enumerates its variants, `instantiate.ts` binds one, `layout.ts` places it and
`scene-render.ts` draws it. Counting `workspace.ts`, which links the files, and the renderer in
`src/core/`, it is ten. Every option below is judged on that count, and the three options give four,
six and ten.

The import graph between the ten folders, counted as import statements rather than as symbols:

| From | To | Edges |
|---|---|---|
| `art` | `core` | 116 |
| `pages` | `art` | 82 |
| `pages` | `lang` | 51 |
| `lang` | `art` | 46 |
| `pages` | `styles` | 46 |
| `pages` | `core` | 41 |
| `space` | `core` | 19 |
| `pages` | `sound` | 16 |
| `ai` | `lang` | 14 |
| `space` | `lang` | 13 |
| `pages` | `space` | 12 |
| `pages` | `family` | 10 |
| `pages` | `ai` | 9 |
| `lang` | `core` | 8 |
| `pages` | `play` | 5 |
| `art` | `sound` | 4 |
| `sound` | `core` | 4 |
| `space` | `art` | 4 |
| `family` | `lang` | 3 |
| `family` | `space` | 2 |
| `lang` | `sound` | 2 |
| `core` | `art` | 1 |
| `sound` | `art` | 1 |
| `space` | `pages` | 1 |

Five of those edges are the ones every option below is judged against, because each is a place where
the shape we have does not agree with the shape we want, and each is one or two lines rather than a
refactor.

`src/core/sheet.ts:9` imports `../art/marks.ts`, one edge against the 116 in the other direction. A
sheet is the page; marks are things drawn on it.

`src/space/grade1.ts:9` imports `../pages/content.ts`, so the year model depends on a page's
build-time glob of the corpus. Nothing should import an app.

`src/art/music.ts` imports four things from `src/sound/`, and `src/sound/piano.ts` imports the
keyboard's shape back from `src/art/music.ts`. A drawn part and a subject capability point at each
other.

`src/lang/checkers.ts:3` imports `src/sound/index.ts`, so the verifier's code checkers depend on a
subject module.

`src/family/progress.ts:9` and `src/family/sample.ts:18` import `src/space/journey.ts`. This is the
one exception the first round of this document allowed, and `src/family/progress.ts` says so in its
own header.

Two files carry more concepts than the file rule allows, and they are worth naming because the three
options split them differently.

`src/art/music.ts` is 4 concepts in 616 lines: a piano instrument, a staff part, a beat track part and
a fretboard instrument, two of which are `Instrument` declarations and two of which are ordinary
`Visual` declarations.

`src/space/journey.ts` is the year type, the `Sketch` union that redescribes ten drawings so the map
can draw stand-ins, the progress record, the mastery reading, prerequisites, states, and unit and term
summaries. [notation-vs-json.md](notation-vs-json.md) already names the `Sketch` union as "a fourth
vocabulary" describing the same ten visuals, and [tracks.md](tracks.md) replaces the `branch` and
`aside` fields in it with a lane per track.

## One long file per concept, taken seriously

The rule needs a definition of concept or it decides nothing, and the definition that does the most
work is the one that counts instances.

A concept is the smallest thing that has a name people already say, holds a single declaration or a
single function people call, and has one reason to change. That gives few files where there are few
concepts and many files where there are many: the notation is one concept, so parsing, checking and
the vocabulary belong in one file of about seven hundred and fifty lines, while a ten frame is one
concept and there are two hundred and fourteen of them, so `parts/` is two hundred and fourteen
files. The rule is not few files per module, which is a different rule and a worse one, because it
would put ten mechanics in one file of two thousand lines and lose the property that makes a mechanic
reviewable on its own.

So the rule cuts both ways in this tree, and it is worth saying which way it cuts where.

It merges `src/lang/`. Fifteen files hold one job with one vocabulary, and a reader following a lesson
passes through eight of them. Parsing text, validating it against a vocabulary and building the typed
documents are three steps in one pass, they change together, and nothing outside the module calls the
middle one. That is one concept and one file.

It splits `src/art/`. Forty-nine files hold two hundred and fourteen declarations, so
`structures.ts` holds eleven drawable things and `music.ts` holds four. Each one is a concept with its
own settings, anchors, box and draw function, and each one is what somebody reviews. That is two
hundred and fourteen concepts and two hundred and fourteen files.

Two corollaries follow, and both cut against instinct.

A type and the code that produces it are one concept when nothing else produces that type. The answer
union and its exhaustive judge are two concepts, because the union is read by the fold, by the
parent's read path and by the store's generated schema, and the judge is read by nobody else. Putting
them in one file would make three readers import the judge to get the union.

An index is a concept of its own. `parts/index.ts` is the catalogue, in display order, and it is the
only list; the same holds for the mechanic index. This is what makes adding a part one file and one
line, and it is the property `check:parts` guards. It is also why the longest file in the tree today,
`src/art/catalog.ts` at 1,225 lines, is not a failure of the rule: it is one list.

Where the options differ is the middle ground between those two poles, and there is a lot of it. Is
the notation one concept or are parsing, checking and verifying three? Is drawing one concept or are
the paper, the pen, the surface and the sheet four? Is the parent's side one concept or four? Each
option takes a position, and the positions produce different file counts, different longest files and
different reading paths.

## The inner `src/` question, answered once

The inner `src/` question does not have an answer of its own. A `src/` inside a module exists to
separate code from the things that sit beside code: a package manifest, a build output, fixtures, a
README. A module that is a package has all four and needs the separation; a module that is a folder
inside a single package has none of them, and `parts/src/tenframe.ts` then carries one path segment
that tells a reader nothing.

None of the three options below is a workspace of packages, because packages force modules to be
coarse and this round is about getting the grain right. So none of them has an inner `src/`, and the
question reopens when the first module needs fixtures, a manifest and a build output at once. The one
case that stands on its own is a directory holding data rather than code, where `curriculum/` and
`art/` have files nothing imports and no code at all, and those are data directories rather than
modules with an empty `src/`.

## The grouping rule

A directory that only groups is justified when nothing imports through it. `apps/` passes, because no
module may import an app, so the extra segment never appears in an import. `scripts/` and `e2e/` pass
for the same reason. `curriculum/`, `art/` and `public/` pass because they hold data that is read
through one loader or compiled into a pack rather than imported by path. `features/` and `kernel/`
fail, because their contents are imported constantly, so every import of every module pays a segment
whose only content is "this is not the other drawer". That is the owner's objection to `features/`
stated as a rule, and it is why none of the three options has one.

It is worth saying plainly that this is a rule about typing and reading rather than about correctness.
Every option below can be made correct, and the grouping rule is about what the paths teach a person
who is new to the tree.

## Where the data model has to live, in any shape

[data-model.md](data-model.md) recommends an append-only event log on the device, with progress
derived by folding, plus two amendments: content and variant identity content-addressed with human
names as aliases, and the event payload union declared once and validated at the edge. That
recommendation puts six pieces in front of us, and every option has to give each of them an owner.

The answer and event unions. `Given`, `Timing`, `QuestionRef`, `Event` and `Envelope`. This is the
declaration the second amendment is about, and it constrains every shape the same way: one of its six
tags is a performance, whose `Struck` type belongs to sound, and one is a drawing, whose `Stroke` type
belongs to the pen. So the union sits above the pen and above sound and below everything that reads an
answer, which means sound cannot be only a subject module. [sound.md](sound.md) reaches the same
conclusion independently: "In the kernel's strict order, sound sits after `pen` and before `parts`,
because a part needs to name a pitch and nothing before `pen` needs to know what a pitch is." So does
[product.md](product.md), which calls sound "a core capability we add once rather than a second
product".

The log. The append, the ordering rule `(device, seq)`, and the duplicate rule. Pure, no DOM, written
by the child's runtime, so a runtime must be allowed to import it.

The fold. `fold(log): View`, producing the sittings, attempts, sheets, rounds, plan and authored
content the parent's side reads. Pure and deterministic. `src/family/` is already written as pure
functions over `Attempt[]` and `Sitting[]`, which is what the fold produces, so the fold is the piece
that makes the existing prototype into the product rather than replacing it.

The readings. `SkillRead`, the published thresholds, the gap ledger, the headline. These are the fold
plus judgement, and the judgement is editorial: every value in `THRESHOLDS` is declared unmeasured and
replacing it is one edit. Three documents argue that this is not part of play:
[parents.md](parents.md) on the strength of the roll-ups, [ai.md](ai.md) because the AI log is more
rows in the same store, and [activities.md](activities.md) because an activity's move log and a
question's attempt "do not merge" and yet have to be read through one interface.

The pack. The compiled content format and its reader, which a runtime imports, and the compiler that
writes it, which a runtime may not. The format is one concept, so it is declared once where the reader
is and the compiler imports it, the same way the vocabulary is derived from the parts index rather
than maintained beside it.

The household folder. The layout of the family's own directory, and the writer that turns a folded
view into `.lumi` files. [data-model.md](data-model.md) recommends building it as the export format
and the handover artefact even though it is not the store.

One detail about the household folder is the same in every option. The writer does not need the
notation's formatter. The shapes it writes are fixed (`day`, `sitting`, `answered`, `sheet`,
`question`, `family`), so the canonical form of a known shape is a template, and a writer of templates
is small and runtime-safe. What keeps the two in agreement is a test rather than a shared import: the
test writes a folder, parses it and formats it, and asserts the text is unchanged, which is the
property the two existing idempotence tests already hold for content. This matters because
[parents.md](parents.md) says the parser, the checker and the verifier may not be in the parent's
bundle, and an export that dragged the formatter in would put a reader of arbitrary text into a build
that has no arbitrary text to read.

## The axes the options differ on

Four axes, and each option takes a position on all four.

How much of the tree is named after the product and how much after the machine. This is the mix the
owner asked for, and the options put the balance in three different places.

How long a file is allowed to get, which follows from where the concept line falls in the middle
ground described above, and which decides how many files exist at all.

Whether a module with one concept in it is a file at the root or a directory holding one file.

Where the backend lives, which is weighed on its own below because the four candidates are worth
comparing separately from the three shapes.

---

## Option 1: domain modules and a thin base

### The shape of it

The modules are the things a family or an author would name, and a technical concern lives in the
domain module that needs it unless two or more need it. The base holds only what the domains share.
Every module is a directory, uniformly, even when it holds one file, so the tree is predictable at the
cost of one level. Files are long: a file holds a whole job, and one of them reaches about 1,200 lines.

The base concedes twice, and both concessions are worth naming up front because they are what the
option cannot avoid. The answer union is shared by lessons, games, music and the parent's side, so it
has to be a technical module with a name of its own. Sound's pure half is needed by `parts/` (a
keyboard names a pitch) and by the verifier (a rhythm item has a code checker), so it cannot live in
`music/`. Those two are not accidents: they are the places where the product has a capability that is
not a subject.

```
lumischool/
│  the base. no domain, no DOM, no content. runs in a plain node test
├─ paper/
│  └─ paper.ts               57     the square (20 units, 5 mm), page sizes, margins, tokens as data
├─ answer/
│  └─ answer.ts              ~120   the answer and event unions, declared once. the first concession
├─ sound/
│  ├─ sound.ts               ~940   pitch, intervals, scales, note values, tunes, voices, the sounder
│  └─ judge.ts               ~670   what a performance is checked against, and the strike model
├─ ink/
│  ├─ ink.ts                 ~300   the surface interface, the recorder, the seeded pen, hatching, seeds
│  ├─ scene.ts               ~280   instantiate a version, place parts on the grid, resolve anchors
│  └─ draw.ts                ~730   draw a scene onto a surface, paginate a lesson, describe it aloud
├─ parts/                    214    one file per drawable thing, plus index.ts, imported/ and guide/
├─ notation/
│  ├─ notation.ts            ~1,195 parse, canonical form, spans, document types, the vocabulary,
│  │                                the check, variants, proofs, fit, the code checkers, the gate
│  ├─ expr.ts                ~630   exact rationals, the expression language, text templates
│  └─ pack.ts                ~320   the compiled format, its reader, and the compiler that writes it
├─ ui/
│  ├─ svg.ts                 ~195   the browser surface, and the readers for imported art
│  ├─ chrome.ts              ~80    the paper chrome and the nav
│  ├─ sound.ts               ~1,090 the Web Audio sounder, the playable mount, the sound switch
│  └─ palette.css                   the one palette, as tokens
│
│  the domain. what a family or an author would name
├─ lessons/
│  ├─ lessons.ts             ~400   sections, questions, flow, answers, grading, hints, feedback
│  └─ print.ts               ~250   the printed sheet, the grown-ups sheet, what may not print
├─ games/
│  ├─ games.ts               ~270   the mechanic contract: a position, a move, six functions
│  ├─ prove.ts               ~242   the prover: a search over reachable positions
│  └─ weigh.ts jump.ts …     10     one file per mechanic
├─ music/
│  ├─ music.ts               ~220   the music strand's own policy: what a lesson asks of an instrument
│  └─ guide.ts               ~500   the guide's music behaviour
├─ year/
│  └─ year.ts                ~300   units, tracks, the path, prerequisites, mastery, review
├─ family/
│  ├─ family.ts              ~700   the morning order, the decision, the week's print pack, the records
│  ├─ record.ts              ~350   the event log, the ordering rule, the fold into a view
│  └─ read.ts                ~630   the readings, the published thresholds, the gap ledger, household
├─ studio/
│  └─ studio.ts              ~300   forms from the vocabulary, previews, the repair loop
├─ assistant/
│  ├─ assistant.ts           ~680   the router, the materials, the two pipelines, the AI log
│  └─ envelope.ts            ~106   the only path from evidence to a model
├─ space/
│  └─ space.ts               ~600   camera, level of detail, spatial layout, minimap
├─ sync/
│  ├─ sync.ts                new    streams copied to and from a family's devices
│  └─ verify.ts              new    the verifier and the prover reachable as a service
│
├─ curriculum/  art/                data, read through one loader, never imported by path
├─ apps/  scripts/  e2e/  public/  .docs/
└─ boundaries.ts                    the reach and the phases, as data
```

15 modules, 29 files outside `parts/` and the mechanics, longest file about 1,195, and four files over
600. A reader following a lesson from text to drawing passes through three files:
`notation/notation.ts`, `ink/scene.ts`, `ink/draw.ts`.

### Where the data model lives

| Piece | Owner | A runtime may import it |
|---|---|---|
| The answer and event unions | `answer/answer.ts` | yes |
| The log | `family/record.ts` | yes |
| The fold | `family/record.ts` | yes |
| The readings and thresholds | `family/read.ts` | yes |
| The pack format and reader | `notation/pack.ts` | yes, and it is in the module that holds the verifier |
| The pack compiler | `notation/pack.ts` | the same file as the reader |
| The household folder | `family/read.ts` | yes, in `apps/home` only |

The log and the fold sit in `family/` because the parent's side is the domain that reads them, and
that is a defensible place until the child's app needs to write an event, which it does on the first
day. So `lessons/` and `games/` import `family/record.ts` to append, which makes `family/` a module
the child's build contains, and the name then says something untrue about what it holds.

The pack reader and the pack compiler being one file is the sharper cost. `notation/pack.ts` is
imported by every runtime and it contains the compiler, so rule three is enforced per file rather than
per module, and `check:runtime` becomes a check on symbols rather than on a module list.

### Which data models it can carry

All five, because the pieces are placed by name rather than by an order. It carries the local-first
log with the caveat above, and it carries the typed-tables and the projections models better than it
looks, because `sync/` is already a module and a schema would go in it.

### What it makes easy

Reading the tree as the product. Ten of the fifteen names are things the owner would say in a
sentence about what lumischool does, and a new person can be pointed at `games/` or `music/`.

Following a lesson. Three files from text to drawing, against ten today, which is the largest
improvement of the three options on the measurement that motivated the brief.

Handing over a subject. The music work is `music/` plus `sound/` plus a family of parts, and the games
work is `games/`, and both are close to what those pieces of work already looked like when they landed.

Fewest modules and fewest files of the three, which is the plain reading of simplicity first.

### What it makes hard

Two phases inside one module. `notation/` holds the parser and the verifier, which may not ship to a
child, and `pack.ts`, which must. `ui/sound.ts` holds DOM code beside `sound/`, which must not. So the
phase rule and the DOM rule are per file, and the two guards that enforce them stop being checks on a
list of module names.

The base creeping. `answer/` and `sound/` are the two concessions the option starts with, and the
question is what happens to the third. A drawing answer needs the pen's `Stroke` type, a performance
needs sound's `Struck`, and the next capability that is not a subject arrives with the same argument.

Long files that hold two audiences. `family/read.ts` at 630 lines holds the readings, the thresholds
and the household folder writer. The thresholds change when somebody measures them, the writer changes
when the folder layout changes, and they have nothing else to do with each other.

Finding a technical concern. A reader looking for the expression language has to know it is in
`notation/`, and a reader looking for the event log has to know it is in `family/`.

### What it costs to adopt now

The least of the three. `notation/notation.ts` is one long concatenation of eight existing files with
their imports removed, which is a mechanical change a person can do in an afternoon and review in
another. The domain modules are mostly renames of folders that already exist.

### What it costs to change later

Low for anything inside a module, because a long file is a long file and moving code within one is
free. High for anything that has to cross the two phase lines running through `notation/` and `ui/`,
because the fix is a module split rather than a move.

### Failure cases

| Case | What happens |
|---|---|
| A part needs a subject module | Resolved by the second concession: sound's pure half is a base module, so `parts/music/piano.ts` reads `sound/sound.ts` and nothing points back. The cost is that the concession had to be made, and the existing `src/art/music.ts` and `src/sound/piano.ts` pair is the evidence that the shape invites the mistake |
| One concept in two files | Resolved by rule one, and by the merge: `sizeOf` is deleted in favour of each part's own `box()`, and there is no separate layout file for it to come back in |
| A low module imports a high one | `ink/draw.ts` importing `parts/marks.ts` is legal, and `parts/` importing `music/` is the failure the second concession exists to prevent. The guard reads `boundaries.ts` either way |
| A module imports an app | Caught: `apps/` is the one prefix nothing may name |
| The seventh answer kind arrives | Three edits: the tag in `answer/answer.ts`, the judge case in `lessons/lessons.ts`, the fold case in `family/record.ts`. The reading in `family/read.ts` is a fourth if the kind is one a parent reads. Fewest edits of the three options |
| A parent edits a lesson a child is halfway through | The sitting recorded the pack digest, so the questions in flight resolve. The edit is a `content-authored` event in `family/record.ts` and a new pack from `notation/pack.ts` |

---

## Option 2: domain modules beside technical modules

### The shape of it

Modules named after the product sit at the root beside modules named after the machine, and nothing is
behind a grouping folder. A module is a file until it holds more than one concept, and then it is a
directory of files, so the tree shows the size of things rather than flattening them into a uniform
shape. Files are as long as one concept is, which in this tree means about seven hundred and fifty
lines at the top and two hundred in the middle.

Three invariants make the shape checkable, and each is one sentence:

A module is a file until it holds more than one concept.

A module has one phase: run time, author time or data.

A module either touches the DOM or it does not.

The second and third are what separate this option from the first. Because `notation/` is author time
whole and `pack.ts` is a run time module of its own, `check:runtime` is a check on a list of module
names. Because the DOM lives only in `ui/`, `check:dom` is the same kind of check. Neither guard has to
read a symbol table.

```
lumischool/
│  technical. no domain in the name, because there is none in the thing
├─ paper.ts                  57     the square (20 units, 5 mm), page sizes, margins, tokens as data
├─ numbers.ts                83     exact rationals and the decimal display hint
├─ expr.ts                   ~550   the expression language, and text with placeholders in it
├─ answer.ts                 ~120   the answer and event unions, declared once
├─ scene.ts                  ~280   instantiate a version, place named parts on a grid, resolve anchors
├─ pack.ts                   ~200   the compiled content format and its reader. the compiler is elsewhere
├─ ink/
│  ├─ surface.ts             ~120   the interface a drawing emits onto, and the recorder a test asserts on
│  ├─ pen.ts                 ~180   the seeded hand: three roughness levels, strokes, hatching, seeds
│  ├─ draw.ts                ~400   draw a concrete scene through the pen onto a surface
│  └─ sheet.ts               ~330   paginate a lesson onto sheets, and describe a scene aloud
├─ parts/                    214    one file per drawable thing, plus index.ts, imported/ and guide/
├─ sound/
│  ├─ pitch.ts               ~450   pitch names and frequencies, intervals, scales, the keyboard maps
│  ├─ beat.ts                ~215   note values, bars, tempo, and a phrase as a schedule
│  └─ judge.ts               ~670   the sounder interface, a performance, the strike model, the judges
├─ notation/                        author time, whole. no runtime imports this module
│  ├─ notation.ts            ~750   parse, canonical form, spans, the document types, the check
│  ├─ vocabulary.ts          ~375   assembled from the parts and mechanic indexes, and imported art
│  ├─ verify.ts              ~440   variants, proofs, capacities, scene fit, the code checkers, the gate
│  └─ compile.ts             ~120   writes what pack.ts declares, and the pack digest
├─ ui/                              the only module that touches the DOM
│  ├─ svg.ts                 ~195   the browser surface, and the readers for imported art
│  ├─ chrome.ts              ~80    the paper chrome and the nav
│  ├─ sound.ts               ~890   the Web Audio sounder, the playable mount, the sound switch
│  ├─ view.ts                ~307   pointer, wheel and key events turned into camera moves
│  └─ palette.css                   the one palette, as tokens
│
│  domain. what a family or an author would name
├─ lessons/
│  ├─ lessons.ts             ~400   sections, questions, flow, answers, grading, hints, feedback
│  └─ print.ts               ~250   the printed sheet, the grown-ups sheet, what may not print
├─ games/
│  ├─ games.ts               ~270   the mechanic contract: a position, a move, six functions
│  ├─ prove.ts               ~242   the prover: a search over reachable positions
│  └─ weigh.ts jump.ts …     10     one file per mechanic
├─ year.ts                   ~300   units, tracks, the path, prerequisites, mastery, the review scheduler
├─ record/
│  ├─ record.ts              ~350   the event log, the append, the ordering rule, the fold into a view
│  ├─ read.ts                ~630   the readings, the published thresholds, the gap ledger, the headline
│  └─ household.ts           ~200   the household folder: its layout, and the writer that fills it
├─ family/
│  ├─ family.ts              ~700   the morning order, the decision, the week's print pack, the records
│  └─ privacy.ts             ~52    what we do not collect, which is shown to parents and so is a promise
├─ assistant/
│  ├─ assistant.ts           ~680   the router, the materials, the two pipelines, the AI log
│  └─ envelope.ts            ~106   the only path from evidence to a model
├─ studio.ts                 ~300   forms from the vocabulary, previews, the repair loop. author time
├─ space.ts                  ~600   camera, level of detail, spatial layout, minimap. no DOM
│
├─ curriculum/  art/                data, read through one loader, never imported by path
├─ apps/  scripts/  e2e/  public/  .docs/
└─ boundaries.ts                    the reach and the phases, as data
```

19 modules, 36 files outside `parts/` and the mechanics, longest file about 750, and four files over
600. A reader following a lesson from text to drawing passes through six files: `notation/notation.ts`,
`notation/vocabulary.ts`, `notation/verify.ts`, `pack.ts`, `scene.ts`, `ink/draw.ts`.

There is no backend module. The reasoning is in the section on the backend below, and the short form is
that today there is no server and an empty one is three files that guess.

Eight of the nineteen modules are named after the product and eleven after the machine, which is the
balance the brief asked for. Six of them are a single file at the root, which is what makes the root
readable at nineteen modules: `paper.ts` is fifty-seven lines and looks like fifty-seven lines.

### The reach

The order is a declared list in `boundaries.ts` rather than a nesting, so a module moves in it by
changing a line. What it says today:

```
paper        nothing
numbers      nothing
expr         numbers
answer       numbers, sound/judge, ink/pen
scene        paper, expr, parts
pack         answer, expr
ink          paper, parts, scene
parts        paper, ink/surface, ink/pen, numbers, sound/pitch
sound        numbers
notation     parts, games, expr, numbers, scene, ink, sound, answer, pack
ui           paper, ink, parts, scene, sound, space, answer
lessons      pack, answer, scene, ink, expr
games        parts, scene, answer
year         pack, answer
record       answer, numbers
family       pack, year, record
assistant    pack, record, answer
studio       notation, ui, parts, games
space        paper, ink, parts
apps/*       by phase: see the app table
```

`notation` may import almost everything below it and nothing may import `notation`, which is the phase
rule stated as a reach. `parts` and `sound/pitch` point one way only, which is the fix for the edge
that exists today.

### Where the data model lives

| Piece | Owner | A runtime may import it |
|---|---|---|
| The answer and event unions | `answer.ts` | yes |
| The log | `record/record.ts` | yes |
| The fold | `record/record.ts` | yes |
| The readings and thresholds | `record/read.ts` | yes |
| The pack format and reader | `pack.ts` | yes |
| The pack compiler | `notation/compile.ts` | no |
| The household folder | `record/household.ts` | yes, in `apps/home` only |

`record/` is one module with three files because the log and the fold are one mechanism, the readings
are editorial judgement over it, and the folder is an output format. Those three change for three
different reasons: the fold changes when an event kind changes, the readings change when somebody
measures a threshold, and the folder changes when the layout changes. `answer.ts` is separate and
technical because four modules read it and it contains no logic. `pack.ts` declares the format and the
reader, and `notation/compile.ts` imports it to write one, so the format has one declaration.

### Which data models it can carry

All five, and it fights none, because an option of the data model changes which modules exist and what
the reach says, and both are lines in one file. The typed-tables model adds `server/` with a schema and
reduces `record/record.ts` to a queue; the projections model adds a projector file to `record/`; the
document-per-sitting model replaces the fold in `record/record.ts` with a reduce. The household folder
is a module in this shape rather than a concession, which is the difference between a thing we build
and a thing we mean to build.

### What it makes easy

Reading the tree as both things at once. A person looking for what the product does finds `lessons/`,
`games/`, `year.ts`, `family/` and `record/`; a person looking for how it works finds `paper.ts`,
`ink/`, `parts/`, `notation/` and `pack.ts`. Neither has to know the other's vocabulary.

The two guards that matter most. One phase a module and DOM in one module make `check:runtime` and
`check:dom` checks on a list of nineteen names, which is a guard a person can read the output of.

Seeing size in the tree. `paper.ts` is a file and `notation/` is a directory of four, and the listing
says which is which before anything is opened.

Moving a module. The order is data, so putting `sound` below `parts` is a line in `boundaries.ts` and a
`git mv`, and the same holds for the next re-order.

### What it makes hard

Nineteen modules and six loose files at the root is more to look at than fifteen directories. The root
is a mixed listing of files and folders, which is honest and is not tidy, and a person who prefers a
uniform tree will not like it.

Six files from text to drawing, against three under the first option. The split between
`notation/notation.ts` and `notation/vocabulary.ts` is the one that costs a step, and it is there
because the vocabulary has two readers: the check and the studio's forms.

Two modules that a domain reading would merge. `record/` and `family/` are the parent's side split by
whether the code is mechanical or editorial, which is a technical distinction inside a domain area, and
somebody will ask why they are not one module.

Naming. Nineteen root names have to be distinct and obvious, and `studio.ts` the authoring logic beside
`apps/studio` the app is a collision this shape survives only because apps are behind a leaf directory.

### What it costs to adopt now

A day or two more than the first option, and the difference is entirely in `notation/`: three files
instead of one, with the seam between the check and the vocabulary drawn deliberately rather than
inherited. Everything else is the same set of moves.

### What it costs to change later

The lowest of the three for anything about where a module sits or what it may import, because both are
data in one file, and for anything that crosses a phase, because the phases are whole modules. The same
as the others for anything that changes what a concept means.

### Failure cases

| Case | What happens |
|---|---|
| A part needs a subject module | Resolved by the reach: `sound/pitch.ts` is below `parts/`, so `parts/music/piano.ts` reads it and the reverse edge is a boundary error the guard names with the file and the line |
| One concept in two files | Resolved by rule one. The part's `box()` is the only size, and `scene.ts` has no `sizeOf` to delete because it never had one |
| A low module imports a high one | Caught by the reach. `ink/sheet.ts` importing `parts/marks.ts` is legal, and `paper.ts` importing anything is an error, because its reach is nothing |
| A module imports an app | Caught: `apps/` is the one prefix nothing may name. `year.ts` reads the year from `pack.ts`, which is where it already comes from |
| The seventh answer kind arrives | Four edits: the tag in `answer.ts`, the judge case in `lessons/lessons.ts`, the fold case in `record/record.ts`, the reading in `record/read.ts`. None crosses a phase and none needs an exception |
| A parent edits a lesson a child is halfway through | The sitting recorded the pack digest from `pack.ts`, so the questions in flight resolve. The edit is a `content-authored` event in `record/record.ts`, verified by `notation/verify.ts` through the service, and compiled by `notation/compile.ts` |

---

## Option 3: technical modules, with domain only where it must appear

### The shape of it

The tree is named after the machine. A module is one concept and almost always one file, so the root is
a long list of `.ts` files, and the domain appears only where there is no technical name for the thing.
Files are short: most are under four hundred lines and none passes five hundred.

This is worth setting out rather than dismissing, because it is the shape that satisfies the file rule
most literally. Every file is exactly one concept, no file is long, and a person can read any one of
them in a sitting. It is also the shape the first round arrived at, with the drawers removed.

```
lumischool/
├─ paper.ts          57     the square, page sizes, margins, tokens as data
├─ numbers.ts        83     exact rationals and the decimal display hint
├─ expr.ts           487    the expression language
├─ template.ts       62     text with placeholders and role nouns in it
├─ surface.ts        ~120   the interface a drawing emits onto, and the recorder
├─ pen.ts            ~180   the seeded hand: roughness, strokes, hatching, seeds
├─ draw.ts           ~400   draw a concrete scene through the pen onto a surface
├─ sheet.ts          ~270   paginate a lesson onto sheets
├─ spoken.ts         ~60    the spoken description of a scene
├─ parts/            214    one file per drawable thing, plus index.ts
├─ instantiate.ts    173    bind one variant: evaluate every expression, fill every template
├─ place.ts          ~110   resolve placements into boxes and anchors into points
├─ pitch.ts          ~450   pitch names and frequencies, intervals, scales, keyboard maps
├─ beat.ts           ~215   note values, bars, tempo, a phrase as a schedule
├─ sounder.ts        ~72    the interface a sound targets, and the two silent implementations
├─ strike.ts         ~308   what a struck note is, and what a performance is made of
├─ judge.ts          ~289   what a performance is checked against
├─ answer.ts         ~120   the answer and event unions
├─ pack.ts           ~200   the compiled content format and its reader
├─ syntax.ts         309    parse into a tree of terms, write the canonical form, keep every span
├─ doc.ts            246    the document types, and the check that produces them
├─ vocabulary.ts     ~375   assembled from the parts and mechanic indexes, and imported art
├─ verify.ts         304    variants, proofs, capacities, scene fit
├─ checkers/         4      the code checkers, one file each
├─ gate.ts           103    one gate: nothing a model writes becomes content without passing it
├─ compile.ts        ~120   writes what pack.ts declares, and the pack digest
├─ mechanic/         12     the contract and one file per kind of play
├─ prove.ts          242    the prover: a search over reachable positions
├─ log.ts            ~200   the event log, the append, the ordering rule
├─ fold.ts           ~150   the fold into a view of sittings, attempts, sheets and rounds
├─ read.ts           ~380   the readings and the published thresholds
├─ gaps.ts           ~250   the gap ledger and the headline
├─ household.ts      ~200   the household folder: its layout and its writer
├─ flow.ts           ~250   sections, questions, and moving through them
├─ judge-answer.ts   ~150   grading an answer with the rules the verifier used
├─ hint.ts           ~120   the hint ladder and the feedback pointed at an anchor
├─ print.ts          ~250   the printed sheet and the grown-ups sheet
├─ plan.ts           ~300   units, tracks, the path, prerequisites, mastery, review
├─ morning.ts        ~270   the morning order and the decision at the end of a lesson
├─ records.ts        ~260   the records some families have to keep, and the settings
├─ camera.ts         ~260   camera, zoom, level of detail
├─ layout.ts         ~250   spatial layout and the minimap
├─ envelope.ts       106    the only path from evidence to a model
├─ router.ts         ~310   what a request may be, and what an answer may be
├─ forms.ts          ~300   forms generated from the vocabulary, previews, the repair loop
├─ ui/               5      the browser surface, the chrome, the audio mount, the palette
├─ http.ts           new    the request edge: read it, check the caller, shape the response
├─ store.ts          new    schema, client, migrations
├─ jobs.ts           new    PDF rendering, content compiles, the verifier as a service
├─ curriculum/  art/  apps/  scripts/  e2e/  public/  .docs/
└─ boundaries.ts
```

About 47 modules, about 52 files outside `parts/` and the mechanics, longest file about 487, and
nothing over 500. A reader following a lesson from text to drawing passes through nine files:
`syntax.ts`, `doc.ts`, `vocabulary.ts`, `verify.ts`, `pack.ts`, `instantiate.ts`, `place.ts`,
`draw.ts`, `surface.ts`.

### Where the data model lives

| Piece | Owner | A runtime may import it |
|---|---|---|
| The answer and event unions | `answer.ts` | yes |
| The log | `log.ts` | yes |
| The fold | `fold.ts` | yes |
| The readings and thresholds | `read.ts` and `gaps.ts` | yes |
| The pack format and reader | `pack.ts` | yes |
| The pack compiler | `compile.ts` | no |
| The household folder | `household.ts` | yes, in `apps/home` only |

This is the cleanest placement of the three, and it is the one place the option wins outright: each of
the seven pieces is a module with a name, so the table has no caveats in it.

### Which data models it can carry

All five, and changing between them is the smallest here, because each piece is a module and swapping
one is swapping one file.

### What it makes easy

The file rule, literally. Every file is one concept and nothing is long, so any file can be read in a
sitting and any file can be replaced without reading its neighbours.

The data model, as above.

Short review. A change is usually one file, and a reviewer does not have to hold a long file in their
head to see what moved.

### What it makes hard

The thing the brief is about. Nine files from text to drawing is the reading problem we already have:
the complaint about `src/lang/` is that fifteen files hold one job, and this shape keeps fifteen files
and moves them to the root. It satisfies the letter of one file per concept and reproduces the
condition the rule was meant to fix, because the rule's purpose was fewer hops rather than shorter
files.

Finding anything by what it does for a family. There is no `games/`, no `music/` and no parent's side.
The domain is spread across `flow.ts`, `judge-answer.ts`, `hint.ts`, `plan.ts`, `morning.ts`,
`records.ts`, `read.ts` and `gaps.ts`, and a person who wants to know how the parent's week is built
has to be told which eight files to open.

The root. Forty-seven entries, almost all of them files, is a listing nobody scans twice. The names
have to carry the whole map, and names like `read.ts`, `place.ts` and `flow.ts` do not.

The mix the brief asked for. Three of forty-seven names are named after the product, so this is the
technical extreme rather than a balance, and it is included to show what that extreme costs.

### What it costs to adopt now

The most of the three, and not by much: it is the same set of moves with more destinations, so it is
more `git mv` and more import rewriting rather than more thinking.

### What it costs to change later

Low for replacing one concept. High for anything that spans a job, because a job spans eight files and
there is no module boundary that tells you which eight.

### Failure cases

| Case | What happens |
|---|---|
| A part needs a subject module | Resolved: `pitch.ts` is below `parts/` in the reach. This option has the fewest ambiguous edges because every module is one thing |
| One concept in two files | The risk this option carries, and it is the one it is worst at. `read.ts` and `gaps.ts` are both readings over a folded view, and the seam between them is a guess |
| A low module imports a high one | Caught by the reach, over forty-seven entries rather than nineteen, which is a longer list to keep true |
| A module imports an app | Caught: `apps/` is the one prefix nothing may name |
| The seventh answer kind arrives | Five edits: `answer.ts`, `judge-answer.ts`, `fold.ts`, `read.ts` and usually `gaps.ts`. One more than the middle option, because the readings are two modules |
| A parent edits a lesson a child is halfway through | The same as the middle option, with the pack digest recorded on the sitting. Nothing about this case distinguishes the three shapes |

---

## The comparison

| | 1 domain-forward | 2 the middle | 3 technical-forward | today |
|---|---|---|---|---|
| Modules | 15 | 19 | about 47 | 10 folders |
| Named after the product | 10 | 8 | 3 | 4 |
| Named after the machine | 5 | 11 | 44 | 6 |
| Files outside `parts/` and the mechanics | 29 | 36 | about 52 | 98 |
| Longest file | about 1,195 | about 750 | about 487 | 1,225 |
| Files over 600 lines | 4 | 4 | 0 | 3 |
| Files from a lesson's text to its drawing | 3 | 6 | 9 | 8 to 10 |
| A module is | a directory, always | a file until it needs to be a directory | a file, almost always | a folder, always |
| Modules with two phases in them | 2 | 0 | 0 | not enforced |
| Modules that touch the DOM | 2 | 1 | 1 | 5 |
| Declared exceptions on the first day | 1 | 0 | 0 | 1 |
| Root entries a person sees | 22 | 26 | about 54 | 5 |
| Backend | `sync/`, two files | none yet, then `server/` | `http.ts`, `store.ts`, `jobs.ts` | none |
| Cost to adopt now | least | a day or two more | most, and not by much |  |

Four rows deserve a note.

"Files from a lesson's text to its drawing" is the owner's complaint as a number, and it is the row
that should carry the most weight, because it is the reason this round exists. The first option wins
it outright.

"Modules with two phases in them" is the row that costs the first option its win. Two of the first
option's fifteen modules hold both author time and run time code, so the guard that keeps the parser
off a child's tablet has to work at the symbol level rather than the module level, and
[ai.md](ai.md) describes that guard as "a constraint rather than a preference".

"Longest file" is where the file rule bites, and the three options put it at about 1,195, 750 and 487
against 1,225 today. All three are a real improvement on the 98-file, 169-line-average machinery we
have, and the difference between them is smaller than the difference between any of them and today.

"Named after the product" against "named after the machine" is the mix, and 10 against 5, 8 against 11,
and 3 against 44 are three genuinely different answers rather than three shadings of one.

### The pairing with the data model

The data model is settled enough to be an input rather than a choice, so the pairing is one paragraph
rather than a matrix. All three options carry all five data models, because the data model changes
which modules exist and none of these shapes makes a module expensive. Where they differ is the
recommended one, the local-first log: the third option places its seven pieces as seven modules with no
caveats, the middle option places them as two modules and three files with no caveats, and the first
option puts the log and the fold inside `family/`, which means the child's build contains a module
named after the parent's side. That last one is a naming problem rather than a correctness problem, and
it is the kind that gets explained to every new person rather than fixed.

---

## The backend, weighed

`services/` is tolerated and not liked, so the four candidates are set out here rather than asserted
inside an option.

`services/` with `api`, `core`, `db`, `jobs` and `export`, which is what the first round carried over
from galleo. Two objections. It is a drawer, and its contents are imported, so it fails the grouping
rule. And `core` is the module where decisions get written a second time: in this product the decisions
already live in pure modules that the browser and the server both import, so a `core` has nothing of
its own to hold. Five modules for a thing that does not exist is five guesses.

One `server/` module with a few long files. `http.ts` reads the request, checks the caller and shapes
the response and makes no decisions; `store.ts` holds the schema, the client and the migrations; `jobs.ts` runs the PDF render and the verifier. One name, one phase boundary at the module edge,
and it grows by lengthening a file rather than by adding a module. The objection is that three files in
one module is three concepts in one module, and the answer is that three concepts in three files inside
one module is exactly what the file rule asks for.

The server as a domain module of its own name. Under the recommended data model the server's job is not
to be the backend, it is to copy streams to and from a family's devices and to run the verifier for a
parent who is authoring. Those are two verbs a family would recognise, so `sync/` and a verifier
service. This is the most honest naming and it has a real risk: it names a thing we have not built, and
if the server also turns out to do accounts, billing and export then `sync/` is the wrong name, and
renaming a module is cheap while renaming it in a hundred imports is not.

A sibling repository. Honest if the server is not being built this year, and
[product.md](product.md) does put accounts, sync and evidence fourth in the milestones. The objection
is decisive: the browser and the server share `answer`, `record`, `year` and `family`, so a second
repository has to either vendor those or publish them, and publishing is the packaging decision this
round deliberately deferred, arriving through the back door.

What we recommend is none of them yet. There is no server, so there is no backend module, and the store
is not a technical module either, because under the recommended data model the device holds the log and
there is nothing to hold server side until sync exists. When there is a server it is one `server/`
module with `http.ts`, `store.ts` and `jobs.ts`, because that is the candidate with the weakest
objection against it and because it can be renamed to `sync/` later if it turns out that is all it
does. Writing the three files now would mean guessing their contents, and an empty directory in a tree
is a claim that something is being worked on.

---

## Recommendation

This is a recommendation, and the decision is the owner's.

We recommend Option 2, the middle: domain modules beside technical modules, all at the root, a module
that is a file until it holds more than one concept, one phase a module, the DOM in one module, and no
backend module until there is a backend.

The reasoning, in the order the arguments weigh.

The brief asks for a mix, and the middle is the only one of the three that is one. Ten names against
five is a domain tree with a base bolted under it, and three against forty-four is a technical tree
with three exceptions. Eight against eleven is a tree a person can read either way, which is what the
owner described.

Simplicity is first, and the middle is not the simplest on every count, so this argument needs to be
made rather than assumed. It has four more modules than the domain-forward option and seven more files.
What it buys with them is two invariants that are each one sentence and each mechanically checkable: a
module has one phase, and a module either touches the DOM or it does not. The domain-forward option
breaks both, in `notation/` and in `ui/sound.ts`, and the consequence is that the two guards standing
between the parser and a child's tablet stop being checks on a list of names and become checks on
symbols. A rule you can state in one sentence and check with a list is simpler than a shorter tree with
a rule that needs a symbol table, and that is the trade being made.

The file rule is satisfied by all three and it does not separate them as much as it first appears. The
longest file is about 1,195, 750 and 487 against 1,225 today, and the machinery goes from 98 files to
29, 36 or 52. Any of the three fixes the thing the rule is about. Where it does separate them is the
reading path, and there the domain-forward option wins with three files against six, which is a real
loss for the middle and the strongest argument against this recommendation. The middle's six are
`notation.ts`, `vocabulary.ts`, `verify.ts`, `pack.ts`, `scene.ts` and `ink/draw.ts`, and two of those
six exist because of a phase boundary that the domain-forward option pays for in a different currency.
We think six with the phases clean is better than three with the phases per file, and it is close.

The technical-forward option is ruled out by its own reading path. Nine files from text to drawing is
what we have, moved to the root, and the complaint that started this round is not that files are long
but that following one thing passes through eight of them. It is included because it is the shape that
satisfies the file rule most literally, and its lesson is that the literal reading of the rule is not
the useful one.

Three things we are not recommending and should say plainly.

We are not recommending a backend module now. See the section above. The moment to build one is when
there is a service, and the shape then is one `server/` module rather than five.

We are not recommending a workspace of packages, and the one thing a workspace is better at is worth
keeping in view: a dependency declared in a manifest cannot be violated, while a phase declared in
`boundaries.ts` can be violated by anybody who has not run the guard. The moment to reconsider is when
`apps/kids` is a real build rather than a folder of pages, because that is when the cost of getting the
phase rule wrong stops being theoretical.

We are not recommending that the scratchpad be migrated in one pass. The modules are created at the
root of the repository and the scratchpad's files move into them one directory at a time, with the
scratchpad's own imports re-pointed as each move lands, so the pages keep working throughout. The
scratchpad directory goes away when it is empty rather than on a date.

## The first migration step

One day, and nothing moves.

Write `boundaries.ts` at the root of the repository: the reach map, the phase of every module, whether
each module may touch the DOM, and the five known violations recorded as dated exceptions with the
file, the line and a sentence about what would remove each. Write `scripts/check-boundaries.mjs`, which
reads it, walks every import in the tree, and fails on an edge the map does not allow. Wire it into
`npm run check` beside the three guards that already exist. Map the scratchpad's ten folders onto the
nineteen modules in one table in the same file, so the guard can be run against the tree as it stands
today.

At the end of the day the guard is green, every exception is written down, and the tree has not
changed. This is the smallest step that makes every later move visible, and it is worth doing before
the first move rather than after the last, because the five violations we know about were found by grep
rather than by a guard and there is no reason to think they are all of them.

Two modules have arrived at the root while this was being written, which is worth recording rather
than describing a tree that no longer exists. `answer/` holds the answer and event unions, which is
where this document puts them and which is the third of the next steps below, so that one is early
rather than out of order. `store/` holds a schema, a client and migrations, which is a
backend module before there is a backend, and the section on the backend above argues against it: the
device holds the log under the recommended data model, so there is nothing to hold server side until
sync exists. That is a decision to confirm or reverse rather than a mistake to fix quietly, and
`boundaries.ts` still does not exist, so neither module is inside a declared reach yet.

The next three steps, in order, each a day or less:

`paper.ts` and `ink/surface.ts` out of `src/core/`, because the surface is rule two and nothing depends
on it yet, so it is the one module that can be created correctly rather than moved and then fixed.

`sound/` created below `parts/`, and `src/art/music.ts` split into its four parts under `parts/music/`.
This removes the two-way edge between a part and a subject module, and it is the first thing the guard
will complain about.

`answer.ts` created, holding the answer and the event unions from [data-model.md](data-model.md) and
nothing else, with no log and no fold yet. This is the piece the data model work needs first and it is
four type declarations.

The first merge, which is the step that proves the file rule rather than describing it:
`notation/notation.ts`, made by concatenating `src/lang/syntax.ts`, `check.ts`, the document-type half
of `registry.ts` and `workspace.ts` and deleting the imports between them. About 750 lines, one
file, and the reading path drops from ten files to seven before anything else moves.

### What can wait

The apps. `apps/kids`, `apps/home`, `apps/studio` and `apps/site` are the shape of the split rather
than the split itself, and the scratchpad's fourteen pages can stay a flat set of entry points until
there is a reason to cap one of them. The reason will be `check:privacy`'s second half, which
[sound.md](sound.md) records as needing "the app split that does not exist in the scratchpad".

The backend. There is no server, so there is no `server/`.

Packages, and the inner `src/`. Both are cheap to add later with a scripted move, so neither should be
decided now under uncertainty.

`curriculum/` as a separately released artefact. The trigger is named in [ai.md](ai.md): generated
content is family scoped and carries provenance, so content stops living only in the tree. Until then
it is a data directory.

`e2e/`. It needs apps to drive.

## The modules, one line each

The recommended shape, in the order `boundaries.ts` declares.

| Module | Phase | DOM | What it is |
|---|---|---|---|
| `paper.ts` | run | no | The square (20 units, 5 mm), page sizes, margins, and the design tokens as data so drawings and components read the same values |
| `numbers.ts` | run | no | Exact rational arithmetic and the decimal display hint, so no floating point reaches question logic |
| `expr.ts` | run | no | The expression language (comparisons, boolean operators, ranges, sets, conditionals, a fixed function list) and text with placeholders in it. No loops, no user functions, no input or output |
| `answer.ts` | run | no | The answer and event unions, declared once: the six answer kinds, the two timing kinds, the question reference and the event envelope |
| `scene.ts` | run | no | Instantiate a version, place named parts on a grid of squares against each other, resolve placements into boxes and anchors into points |
| `pack.ts` | run | no | The compiled content format and its reader, versioned so an app can refuse a pack it does not understand. The compiler that writes one imports this file for the format |
| `ink/` | run | no | How anything is drawn: the surface a drawing emits onto and the recorder a test asserts on, the seeded pen, drawing a concrete scene, paginating a lesson onto sheets, and the spoken description |
| `parts/` | run | no | One file per drawable thing, each a single declaration of settings, anchors, box, capacity and draw function, plus the catalogue that is the only list |
| `sound/` | run | no | Pitch names and frequencies, intervals, scales, note values, bars, tempo, tunes, voices as data, the sounder interface and its silent and recording implementations, performances and the judges over them |
| `notation/` | author | no | The text and everything that decides whether content is real: parse, canonical form, spans, the document types, the check, the vocabulary assembled from the parts and mechanic indexes, the proofs, and the compiler. No runtime imports this module |
| `ui/` | run | yes | The only module that touches the DOM: the browser surface, the paper chrome, the one palette, the Web Audio sounder and the playable mount, pointer events turned into camera moves, the minimap, full screen for a map's frame (`fullscreen.ts`, built), and the two clients for the API, the grown-ups' with the browser's sign-in hint and the children's with its queue of unsent answers |
| `lessons/` | run | no | A lesson: sections, questions, flow, holding answers, grading them with the rules the verifier used, hints, feedback pointed at an anchor, and the printed sheet with the grown-ups sheet beside it |
| `games/` | run | no | Activities: the mechanic contract, one file per kind of play, and the prover that searches a position graph rather than enumerating a cross product |
| `year.ts` | run | no | The year: units, tracks, the path, prerequisites and side paths, the skill graph, mastery from evidence, and the review scheduler |
| `tracks.ts` | run | no | The tracks a family turns on, and each subject's title, what it covers and its marker. It is apart from `year.ts` because the grown-ups' app reads the table and a child's map reads the year, and one module for both puts the table in a child's first screens |
| `record/` | run | no | What happened and what it says: the event log with its ordering and duplicate rules, the fold into a view, the readings over that view with the published thresholds, and the household folder with the writer that fills it |
| `family/` | run | no | The parent's side: the morning order, the decision at the end of a lesson, what to print this week, the records some families have to keep, and the list of what we do not collect that is shown to parents |
| `assistant/` | run | no | The router that decides what a request may be, the envelope that is the only path from evidence to a model, and the AI log. The gate itself is in `notation/` |
| `studio.ts` | author | no | Authoring logic: forms generated from the vocabulary, previews, and the repair loop that hands errors back to an author or a model |
| `space.ts` | run | no | The infinite canvas as maths: camera, zoom, level of detail, spatial layout. Nothing about lessons, and no DOM |

### The apps

Four builds from one tree, each its own Vite entry, each capped by the phase field in `boundaries.ts`.

| App | Audience | Phases it may contain | Notes |
|---|---|---|---|
| kids | the child | run, data | no third-party code, no outside hosts, no author time code, no model. Checked by `check:privacy` and `check:runtime` |
| home | parents and tutors | run, data | posts notation to the verifier service rather than containing it |
| studio | authors | run, author, data | the notation editor, the art shelf, the drawing pad |
| site | the public | run, data | prerendered; the pack it shows is built, not parsed. Until steps 6 and 7, it is neither: the seam parses the corpus in the browser |

Printing is not a build. It is a target: `ink/` paginates, the home app prints, and a job renders the
same sheets to PDF through a PDF surface.

The shared game player lives in `engine/ui/games.tsx`, with browser adapters in `game-turn.ts` and
`game-action.ts`. Its declared boundary permits reading `school/games` contracts and catalogue;
game rules never import the player. App wrappers choose the surrounding page presentation through
the player's `onPlaying` callback. Turn games retain a paper workspace and action games use a
focused stage. See [games-migration.md](games-migration.md) for the current migration scope.

## Guards

Six carried over from galleo, with `check:boundaries` reading `boundaries.ts` rather than a lint
config:

| Guard | What it enforces |
|---|---|
| `check:suppressions` | no lint or type suppressions and no coverage pragmas |
| `check:program` | every tracked TypeScript file is part of the type check |
| `check:boundaries` | built, `tools/scripts/check-boundaries.ts`: the reach, the phases and the declared exceptions in `boundaries.ts`, over every import at the root, type imports included, and the one seam into the scratchpad. It plants violations to prove it still reports |
| `check:copy` | no em-dashes in text people read, including notation text and prompts |
| `check:maps` | the module table in this document still matches the modules at the root |
| `check:validation` | every request body is read through a schema |

Specific to this product. Three of these exist in the scratchpad today and the rest do not, and the
table says which:

| Guard | State | What it enforces |
|---|---|---|
| `check:parts` | to write, with move 0.2 of step 3 | Every drawing is declared once, in one file named by its id in its family's folder, with its settings and their ranges, its takes, a box, a draw function, a description and a test, and appears in `parts/catalog.ts` exactly once. Its description is 15 to 30 words with no em-dash or exclamation mark, and a drawing below the bar is listed with its reason. Extended three ways since the first round: a mechanic's settings come from the mechanic's own declaration, a part declaring `keys()` returns an anchor for every key it offers, and a part that can be sorted or divided declares the attribute. The instrument clause already has a test, in `test/sound.test.ts` under "every key the keyboard offers has an anchor drawn for it" |
| `check:dom` | to write | Only `ui/` touches the DOM or imports a UI framework. One module, so this is a check on a name rather than on a symbol table |
| `check:runtime` | to write | No app that declares only run time phases imports an author time module, which is `notation/` and `studio.ts` |
| `check:content` | partly, in `npm test` | Every notation file parses, is in canonical form and passes verification |
| `check:pack` | to write | The pack an app ships was compiled from the content in the tree, and its version matches the reader |
| `check:art` | built, `scripts/check-art.mjs`, and `tools/scripts/__tests__/art.test.ts` | Hand-drawn assets follow the conventions the importers rely on, and `parts/imported/files.ts` holds every file in `content/art/` as it is now |
| `check:print` | built, `scripts/check-print.mjs` | Printed pages neither overflow nor get silently scaled down. Two clauses to add: no scene exceeds the printable width, which [tracks.md](tracks.md) reports 31 of the 60 maths scenes currently break with nothing catching it, and an activity named inside a printed lesson section is a build error rather than a blank page |
| `check:privacy` | half built, `scripts/check-privacy.mjs` | The media half is built and wired into `npm run check`: it refuses the microphone and camera APIs in code but not in comments, in the child's build and the parent's. The outside-host half needs the app split and the script says so rather than pretending to cover both |
| `check:prompt` | to write | The envelope is the only reader of the evidence store and its field list is one place |
| `check:voice` | to write | Child-facing strings carry no first person and no relational vocabulary, the way `check:copy` rejects em-dashes |
| `golden` | built for step 3, `.scratchpad/scripts/golden.mjs` | Every take of every drawing on the shelf gives the markup, box, anchors and motion it gave before a move, and with `--shots` the same pixels at question size and as a tile, on screen and in ink. It is run by hand before and after each move rather than in `npm run check`, since it needs Chrome, and it goes with the scratchpad |

## Tests

| Tier | Files | Runs against |
|---|---|---|
| unit | `*.test.ts`, beside the code | pure code |
| drawing | the suites in `engine/parts/__tests__/` and in each family's `__tests__/` | parts drawn onto the recorder surface, no browser: the catalogue, the bar, the descriptions and each family's own rules |
| sound | `*.sound.test.ts` | tunes and performances through the recording sounder, no audio hardware |
| content | `*.content.test.ts` | the whole corpus, parsed, checked and verified |
| integration | `*.itest.ts` | a real Postgres test database |
| browser | `*.browser.test.ts` | real Chromium, for rendering and print |
| end to end | `e2e/**/*.spec.ts` | the running apps |

The drawing tier exists because of rule two, and it is what stops a drawing shipping unrendered, which
has already happened once. The sound tier is the same rule applied to the second kind of output, and
the scratchpad already has it in one file.

While step 3 moves the drawings, `.scratchpad/scripts/golden.mjs` stands beside the drawing tier. It
renders in headless Chrome, because the scratchpad's drawings build SVG for themselves, which the
recorder cannot keep, and a move has to show that each drawing gives the markup and the pixels the
scratchpad gave.

A long file needs its tests split rather than lengthened with it, so `notation/notation.ts` at about
750 lines has `notation/parse.test.ts`, `check.test.ts` and `canonical.test.ts` beside it. One file
per concept is a rule about source, and a test file is named after the behaviour it holds.

Coverage minimums are highest for `notation/` and for the technical modules, since content correctness
depends on them.

## Root files and ports

The root holds `AGENTS.md`, `CLAUDE.md`, `README.md`, `package.json`, `pnpm-lock.yaml`,
`tsconfig.json`, `boundaries.ts`, `eslint.config.js`, `vite.config.ts` (one entry per app), the vitest
configs, `playwright.config.ts`, `docker-compose.yml`, `.env.example`, `env.d.ts`, `.prettierrc` and
`.node-version`. With nineteen modules and six grouping or data directories beside those, the root is
about thirty-eight entries, which is the cost of having no drawers.

lumischool uses the 85xx host ports, which no sibling project uses: 8500 for the Vite dev server, 8501
for the API, 8502 for Postgres, 8503 reserved.

## Moving the scratchpad in

Every file in the scratchpad, in the module the recommended option gives it. Where a row says a
file merges into another, the merge is the file rule being applied rather than a rewrite. Under the
decided layout each module sits in its drawer: `paper`, `numbers`, `expr`, `answer`, `scene`, `pack`,
`space`, `ink`, `parts`, `sound`, `motion`, `notation` and `ui` in `engine/`; `lessons`, `games`,
`worlds`, `year`, `record`, `family` and `assistant` in `school/`; and `store` is `server/db/`.

| Scratchpad | Destination |
|---|---|
| `src/core/tokens.ts`, `U`, `lineTicks` | `paper.ts` |
| `src/core/pen.ts`, `strokes.ts` | `ink/pen.ts`, emitting onto a surface instead of building SVG; `strokeVisual`, the stroke files' reader, to `parts/imported/` with the other readers |
| `src/core/sheet.ts` | `ink/sheet.ts` for the layout, after `parts/`, whose marks it draws with, and `ui/` for the HTML it places |
| `src/core/visual.ts` | splits: the surface half into `ink/surface.ts`, the render half into `ui/svg.ts` |
| `src/core/svg.ts`, `svgAsset.ts`, `excalidraw.ts` | `ui/svg.ts` for the drawing, `ink/pen.ts` for the geometry the pen draws with (`roundedRect`, `starPoints`, `rng`), `parts/imported/` for the readers |
| `src/core/chrome.ts` | `ui/chrome.ts`. There is no theme switch to carry with it: the app and the site are light, once |
| `src/styles/*.css`, `fonts.ts` | `ui/palette.css` for the tokens, and the per-page sheets to the app that owns the page |
| `src/art/*.ts` | `parts/<family>/<id>.ts`, one drawing per file, named by its id, in the folder of the shelf it is found on, rewritten onto the surface as it moves; the lettering in `paperkit.ts` to `parts/lettering.ts`, with the props, marks and speech helpers most drawings share |
| `src/art/music.ts` | splits into one file per drawing in `parts/music/`, as every file of drawings does |
| `src/art/catalog.ts`, `shelf-groups.ts` | `parts/catalog.ts`, the ordered ids with a loader for each; `parts/shelf.ts`, the grouping and the search words, which only the studio and search load; and the shelf page in `apps/studio`. Since E1 (22 September 2026) `shelf-groups.ts` is gone and `src/art/catalog.ts` names no drawing, deriving the scratchpad's shelf from the root's catalogue until the shelf page moves |
| `src/art/guides/` | `parts/guide/`, one file per design, with the shared kit beside them |
| `src/art/animation.ts` | each drawing's declaration into its own `motion`, and the families' defaults into `parts/drawing.ts` beside the contract (done; the file went with E1 on 22 September 2026) |
| `src/engine/animation.ts` | `motion/animation.ts`, unchanged |
| `src/core/animate.ts`, `src/styles/animation.css` | `ui/animate.ts`, which plays `motionOf` of a drawing |
| `src/art/imports.ts`, `index.ts` | `parts/imported/`, reading the files from `parts/imported/files.ts`, which `tools/scripts/art.ts` compiles from `content/art/` in place of Vite's glob, with the size and anchor reader `notation/vocabulary.ts` uses |
| `src/lang/syntax.ts`, `levels.ts`, `check.ts`, `workspace.ts` | `notation/notation.ts` (moved 22 September 2026) |
| `src/lang/registry.ts`, `parts.ts`, `assets.ts` | `notation/vocabulary.ts`, the parts read off `parts/catalog.ts` (moved 22 September 2026) |
| `src/lang/verify.ts`, `checkers.ts` | `notation/verify.ts` and one file per subject's checkers (moved 22 September 2026) |
| `src/lang/compile.ts` | `notation/compile.ts` (moved 22 September 2026) |
| `src/lang/expr.ts`, `templates.ts` | `expr.ts`, which holds `expr.ts` and the half of `templates.ts` that reads a text's placeholders; the filling half (`fill`, `fillParts`, `noun`) took neither of the options weighed under `engine/expr.ts` above, since nothing at run time fills a noun, and is `notation/instantiate.ts`, with `NOUNS` in `notation/vocabulary.ts` (moved 22 September 2026) |
| `src/lang/rational.ts` | `numbers.ts` |
| `src/lang/instantiate.ts`, `templates.ts`, `layout.ts` | `notation/instantiate.ts`, with `wrap` and `pyramidRows` in `scene.ts` (moved 22 September 2026) |
| `src/lang/scene-render.ts` | `ui/scene.ts`, not `ink/draw.ts` (moved 22 September 2026) |
| `src/lang/arrange.ts` | `engine/arrange.ts`, moved 16 September 2026: a part the child arranges (the see-saw plank, the cake), its boards, measures, layouts and the proof over every arrangement, over `motion/lever.ts` and `motion/cuts.ts`; the verifier, the renderer and the arrange page import it from the root |
| `src/pages/lesson-arrange.ts` | the page half is `engine/ui/arrange.tsx`, the sheet's arranged question (built 16 September 2026); the scratchpad's page stays as the developer's surface until `lessons.html` goes |
| `src/lang/lesson-render.ts`, `lessons.ts` | `lessons.ts` is `notation/lessons.ts` (moved 22 September 2026); `lesson-render.ts` stays until its pages move |
| `src/sound/pitch.ts`, `scale.ts`, `keys.ts` | `sound/pitch.ts`, `scale.ts`, `keys.ts`, one for one, with `Note` declared in `pitch.ts` and `Key` in `keys.ts`. Moved (16 September 2026) |
| `src/sound/beat.ts`, `tune.ts` | `sound/beat.ts` is there (moved 16 September 2026); `tune.ts` merges into it when the rest of the sound model moves |
| `src/sound/fretted.ts` | `sound/fretted.ts`, the fret positions the fretted instruments' drawings read. Moved (16 September 2026) |
| `src/paint/mix.ts` | `pigment.ts`, the paint mixing that the painting drawings, the Paint tab and the verifier share. Moved (16 September 2026) |
| `src/sound/types.ts`, `sounder.ts`, `judge.ts`, `strike.ts`, `voice.ts`, `index.ts` | merge into `sound/judge.ts` |
| `src/sound/web.ts`, `switch.ts`, `instrument.ts`, `render.ts` | merge into `ui/sound.ts`, because they touch the DOM and the audio hardware |
| `src/sound/piano.ts` | disappears: its one call becomes the instrument fields on the two parts |
| `src/sound/guide.ts`, `lesson.ts` | `lessons/lessons.ts`, because they are the music strand's lesson policy rather than sound |
| `src/sound/inventory.ts`, `src/play/inventory.ts` | `apps/studio`, because they are lists a page shows |
| `src/play/types.ts` | `games/games.ts`, as the mechanic contract |
| `src/play/weigh.ts`, `jump.ts`, `rule.ts`, `race.ts`, `pay.ts`, `share.ts`, `shunt.ts`, `spell.ts`, `pour.ts` | `games/`, one file each, unchanged |
| `src/play/prove.ts` | `games/prove.ts` |
| `src/play/log.ts` | `record/record.ts`, as the move log's contribution to the event union |
| `src/play/activities.ts` | `curriculum/`, as notation rather than as TypeScript data |
| `src/family/evidence.ts`, `progress.ts`, `tracks.ts` | merge into `record/read.ts`, which removes the one declared exception the first round allowed |
| `src/family/plan.ts`, `days.ts`, `morning.ts`, `decide.ts`, `records.ts`, `settings.ts`, `index.ts` | merge into `family/family.ts` |
| `src/family/privacy.ts` | `family/privacy.ts`, kept apart because it is shown to parents and is therefore a promise rather than a helper |
| `src/family/pack.ts` | `pack.ts`, which is where its own header says it wants to read a lesson from |
| `src/family/sample.ts`, `sample-tracks.ts` | `record/fixtures/`, as a folded week rather than as 742 lines of TypeScript literals |
| `src/space/camera.ts`, `lod.ts`, `seed.ts` | merge into `space.ts` |
| `src/space/view.ts`, `minimap.ts` | `ui/view.ts`, because they touch the DOM: they turn pointer, wheel and key events into camera moves, and draw the minimap. The view has moved (15 September 2026); the minimap was deleted with the year map (17 September 2026) |
| `src/world/working.ts` | `ui/working.ts`, what a child writes on paper, day-relative for the roll; after the privacy decision in [journal.md](journal.md). The canvas's own ink, `src/space/ink.ts`, was deleted with the year map (17 September 2026) |
| `src/world/map.ts`, `src/pages/map-life.ts` | `ui/map.ts`, the country painter, with the country's life as keyframes; it reads only the `MapView` it is given. Moved (16 September 2026) |
| `src/world/shelf.ts`, `scripts/world-shelf.mjs` | the loader's fallback (`engine/ui/drawings.ts`) read the drawings the catalogue did not hold yet from it, and the script left out what had moved, so it shrank with each art move; both went with the last, in E1 on 22 September 2026, and the loader has no fallback |
| `src/world/refs.ts` | deleted with the Worlds tab, whose pages read a drawing by its art id through it; `viewOfTrip` moved to `worlds/sample.ts` (22 September 2026), and `refs.ts` binds it to the loader's drawings for the scratchpad's pages |
| `src/world/paint.ts`, `scenery.ts` | `ui/scenery.ts`, the world painter, reading only the `WorldView` it is given; the two drawings in `scenery.ts` are catalogue drawings since the stories and home move. Moved (16 September 2026) |
| `src/world/player.ts` | `ui/player.ts`, the world's motion on the page, on `ui/animate.ts`. Moved (16 September 2026) |
| `src/world/fly.ts` | `ui/fly.ts`, the paper plane on the page, on `motion/plane.ts` and `motion/camera.ts` |
| `src/world/spot.ts`, `squares.ts`, `src/play/dots.ts` | `games/spot.ts`, `squares.ts` and `dots.ts`, one mechanic each, with their page side as overlays in `ui/try.ts`; pending the owner's decisions on the puzzles |
| `src/world/view.ts`, `src/space/progress.ts` | `worlds/sample.ts`, the sample child's record with the child (moved 22 September 2026). It was to be `record/fixtures/`, and went with the sample child instead because `record` may not reach the worlds and a fixture of the child is one concept with their journey; the worlds to come, `next.ts` and `future.ts`, go with the Worlds tab |
| `src/pages/world.ts`, `world-canvas.ts`, `world-page.ts`, `world-poster.ts`, `world-to-come.ts`, `world-try.ts`, `world-links.ts` | deleted with the Worlds tab, once `Overworld` and `World` in `ui/` hold what they prototyped: the dive, the map in words, the day's events, the poster, the page form and the puzzles |
| `src/pages/site-w-map.ts`, `site-w-world.ts` | the backdrops draw through `Overworld` (16 September 2026); the two stay for the Auth, Backdrops, Worlds and Map-art tabs and Site Try, which draw their map windows and rolls with them, and go with those tabs |
| `src/pages/site-w-sections.ts`, `site-sample.ts` | the site's sample child, moved to `worlds/sample.ts`, `tools/site-sample.ts` and `apps/site/` (22 September 2026); `site-w-sections.ts` and Site W went with it, `site-sample.ts` stays as Site Try's slicing script's reader of the root's sample child, and the sample child's map behind the Grown-ups tab is `sample-backdrop.ts` |
| `src/space/journey.ts` | splits: the year and the path into `year.ts`, the `Sketch` union deleted in favour of a one-node scene, the progress record into `record/record.ts` |
| `src/space/years.ts`, `grade1.ts`, `progress.ts`, `layout.ts` | `year.ts`, reading the year from `pack.ts` rather than from a page's glob; `layout.ts` was the year map's geometry and was deleted with it (17 September 2026) |
| `src/space/journey-map.ts`, `map-art.ts`, `lesson-place.ts`, `year-list.ts`, `year-shelf.ts`, `pages.ts`, `src/pages/journey.ts`, `journey.html` | deleted (17 September 2026): the map of worlds replaced the year map, as the map plan's decision 10 records |
| `src/ai/types.ts`, `router.ts`, `materials.ts`, `child.ts`, `parent.ts`, `log.ts` | merge into `assistant/assistant.ts` |
| `src/ai/envelope.ts` | `assistant/envelope.ts`, kept apart because `check:prompt` requires it to be the only reader of the evidence store |
| `src/ai/gate.ts` | `notation/verify.ts`, because [ai.md](ai.md) says the gate is the same `Workspace` the editor, the tests and the build use |
| `src/ai/model.ts` | a job, once there is a server. Until then it stays a stub beside `assistant/` |
| `src/pages/content.ts` | `curriculum/index.ts`, as one loader nothing imports around |
| `src/pages/*.ts`, the html entries | `apps/*` |
| `content/` | `content/curriculum/`, moved in step 2 of "The order from here"; its files are not yet filed by track and grade |
| `art/` | `content/art/`, unchanged, moved in step 2 |
| `test/*.test.ts` | beside the code, keeping `test/helpers.ts` as `curriculum/fixtures.ts` |
| `scripts/check-art.mjs`, `check-print.mjs`, `check-privacy.mjs` | `scripts/`, unchanged |

Leaving out the five rows step 3 added and the ten step 4 added, that is 98 files of machinery becoming 36 across 53 rows, of which 14 are merges and 4 are splits,
and those 18 are where the file rule does its work. Order of moves, so the tree is never broken for long: `boundaries.ts` and its guard first, then
the technical modules bottom up, since they have the fewest dependencies and the most dependents; then
`notation/`, which needs only the parts and mechanic indexes; then `curriculum/`, which is data; then
the domain modules; then the apps one at a time, starting with studio, because it is the one we use
while building the rest.

## What the data model decision closes

Two of the first round's open decisions are answered by [data-model.md](data-model.md) rather than by
this document, and it is worth recording which.

Whether evidence is its own module is settled: it is, as `record/read.ts`, and it is in `record/`
rather than in `family/` because the fold and the readings change for different causes. Three
documents argue it out of play on the strength of the readers rather than the size
([parents.md](parents.md) for the roll-ups, [ai.md](ai.md) because the AI log is more rows in the same
store, [activities.md](activities.md) because two grains that do not merge have to be read through one
interface).

How a pack is versioned against the vocabulary is answered by the first amendment: content and variant
identity are content-addressed with human names as aliases, a pack is named by its own digest, and a
sitting records which pack it played. An app refuses a pack whose vocabulary version it does not
understand, and the digest is what makes "which content was this" a field rather than an assumption.

## Open decisions

- Whether the reading path of six files is worth the two clean phase boundaries it buys. This is the
  one place the recommendation is close, and the domain-forward option's three files is the number to
  weigh it against.
- Whether `record/` and `family/` should be one module. They are the parent's side split by whether
  the code is mechanical or editorial, which is a technical distinction inside a domain area.
- Where the run time policies that are neither a mechanic nor content live. [activities.md](activities.md)
  puts the twenty-second nudge in the lesson runtime and the mechanic's code below it, and
  [sound.md](sound.md) puts the rhythm bar builder in the runtime as a mechanic. Those two cannot both
  be right, and the reading the rest of `activities.md` depends on is that mechanic code is technical,
  so the bar builder is a mechanic in `games/` and its nudge is a policy in `lessons/`.
- Whether `curriculum/` stays a data directory. The trigger is generated content arriving family
  scoped with provenance, which [ai.md](ai.md) treats as certain rather than possible.
- How the non-maths set is described. [curriculum.md](curriculum.md) has forty lessons beyond maths,
  [sound.md](sound.md) promotes music to a strand of ten, and [tracks.md](tracks.md) has seven tracks
  and 150 lessons. The three do not agree, and a directory layout under `curriculum/` should not bake
  one of them in until they do. This should be reconciled in `curriculum.md` rather than here.
- Whether the phase rule moves from a guard to a resolver, which is the one thing a workspace of
  packages is better at. The moment to decide is when `apps/kids` is a real build.
