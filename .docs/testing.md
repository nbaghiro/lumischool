# Testing

Decided and built for unit and integration tests, 4 October 2026; the end-to-end tier is grouped and
kept local, and its move to CI is still a plan. This document says which tier a test belongs to, how
each tier is run on a laptop and in CI, where a new end-to-end spec goes and what it starts from, what
was changed to make `npm run check` mean the same on every machine, and what is left.

## The rule

A test belongs to the cheapest tier that proves its fact with real components. A fact about one
function's output is a unit test and needs nothing. A fact that holds only when the server, the
database and its row-level security act together is an integration test, and it runs against the
Postgres in `docker-compose.yml` with the server's own `app()` called in the same process, so neither
the network nor a fake stands in for either side. A fact that only a browser can show, such as a tap
target's size or what happens when a second tab signs out, is an end-to-end test. When the same fact
is proven in two tiers, we keep the cheaper one and delete the other.

Mocking stays where the program meets something a test cannot or must not reach: a DOM in Node, a
speech synthesiser, a third party's API, or a server answer the real server cannot be made to give,
such as a proxy's error page. Everything of ours is used as it is. There is no mocking library; the
fakes are written by hand in the suite that needs them.

## The tiers

| Tier | Files | Command | Needs |
|---|---|---|---|
| Unit | `*.test.ts` in a `__tests__/` folder: 276 | `npm run test:unit` | nothing outside the process |
| Integration | `*.itest.ts` in `server/**/__tests__/`: 21 | `npm run test:integration` | the Postgres of `npm run db:up` |
| End to end | `tools/e2e/<area>/*.e2e.ts`: 68 specs in seven folders | `npm run test:e2e` | `npm run dev` running, installed Chrome and WebKit |
| Mobile end to end | `apps/mobile/e2e/*.yaml`: 1 flow | Maestro, by hand | a development build on a simulator or phone |

`npm run check` runs the type check, lint, format check, the guards that read source (suppressions,
boundaries, voice, journeys, the database's), then `test:unit` and `test:integration`. It is what CI
runs, and it has to pass before work is called done. The two end-to-end tiers are outside it.

`test:unit` runs four files at a time. Each of the suites that load the whole curriculum holds about
3 GB while it runs, and Node's default of one process per core ran seven of them at once and filled a
laptop's memory.

The suffix is the tier: a file named `*.test.ts` may not need a database, a browser or the network,
and a file named `*.itest.ts` is run against Postgres, one file at a time. Each `.itest` file gets a
database of its own, `lumischool_test_<pid>`, built from the real migrations by
`server/db/__tests__/test-db.ts`. No test depends on the ones before it: a suite either empties every
table before each test or makes rows of its own under addresses no other test uses. With no database the integration tests fail and say so, on a laptop as in CI; there is no
setting that turns them into a skip.

## What makes a passing check mean the same everywhere

- The database tests fail without a database (above).
- `test:unit` and `test:integration` run with `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `TUTORING_ENABLED`,
  `TAVUS_API_KEY` and `RESEND_API_KEY` removed from their environment, so no test can call Gemini,
  Tavus or Resend from a machine that has a key in its shell. The tests do not read `.env`.
- Nothing in the unit tier needs a browser. The part of the map snapshot test that draws the map in
  Chrome is `tools/e2e/map/map-snapshots.e2e.ts`; the unit test keeps the checks on the snapshots'
  folder and descriptions.
- `tools/__tests__/first-view.test.ts` makes the one production build a check makes. A change that
  breaks a build fails there, and the same build is checked for its byte budgets and for any
  grown-ups' route in the children's chunks (`tools/kids-build.ts`). `check:build` and
  `check:kids-build`, which built the apps twice more, are gone.
- The checks that read every compiled lesson (`check:voice`, `check:journeys`, and the voice and
  reaches suites) take them from `curriculumLessons()` in `tools/pack.ts`, which compiles once and
  keeps the result under `node_modules/.cache/lumischool/`, keyed by a hash of the curriculum, the
  engine, the school and `tools/pack.ts`. A second run with nothing changed reads the kept copy back
  through the pack's checker: `check:journeys` took 28.6 s cold and 5.6 s warm.
- A probe in the notation suites builds a workspace from the probe and only the files it names,
  rather than verifying the whole curriculum again for each probe. `corpus.test.ts` went from 352 s
  to 59 s, and two probes in `layout.test.ts` from 86 s and 130 s to a few milliseconds.

## CI

`.github/workflows/check.yml` runs `npm ci` and `npm run check` on every push to `main` and every pull
request, with Node from `.node-version` (the version Render runs) and a `postgres:18` service published
on 8502 with the local container's owner role. The database tests find it at the defaults
`server/db/client.ts` names, so the job sets no environment of its own and runs exactly what a laptop
runs.

## End-to-end specs

The specs are grouped by area, and `npm run test:e2e -- <folder>` runs one area:

| Folder | What it covers |
|---|---|
| `family/` | sign-in, a family's grown-ups and members, account, kids' sign-in, weekly email, pages while they load |
| `site/` | the site a visitor sees, its sample lesson and its map backgrounds |
| `map/` | the map and the worlds, a child's journeys, the snapshots |
| `lessons/` | lessons in Explore, the coding run, tutoring, the companion's steps, game cards in a lesson, letter boxes |
| `calendar/` | the calendar planner |
| `painting/` | the painting workspace and its policy |
| `games/` | the Games tab and every game |

A new spec goes in its area's folder and starts from the helpers that exist, rather than writing its
own copy:

- `tools/e2e/steps.ts`, for every area: `test` (the case with Vite's hot updates held off),
  `signInAs` and `signInHere` (a fresh family), `askForCode`, `typeCode` and `codeFor` (the code from
  the local outbox), `openChildrensView`, `holdGrownUps`, `childsMap`, `atScreen` and `errorCard`,
  `signOut`, `newDevice` (another browser), `smallTargets` (the 44 px rule) and `FAMILY_PIN`.
- `tools/e2e/games/play.ts`, for a game: `openGame` opens a game at a level with its probe drawn and
  collects page errors, and `reducedMotion` turns reduced motion on from the pause dialog.
- `tools/e2e/field.ts`: `fieldPoints`, where each of a game's things is on the screen.
- `tools/e2e/train-hands.ts`: `playTrain`, the sound train played to its end.

A spec that needs a page of its own mounts it from a file beside it, as
`games/game-card-harness.tsx` and `map/map-fixture.tsx` do. A path a spec builds from its own location
(`import.meta.url`, `import.meta.dirname`) counts the folder.

## Decided against

- Passing the Gemini and Tavus keys to tutoring and the companion through the server's `Config`
  instead of `process.env`. It would change about ten functions in `server/tutoring.ts`,
  `server/companion.ts` and `server/adaptive-help.ts`, which are still being built, and the test
  scripts removing the keys gives the tests the same guarantee.
- An integration test that drives the client in `engine/ui/api.ts` against the real server. It would
  have to import both `server/db/` and `engine/ui/`, which `check:db` and `check:boundaries` refuse
  for anything outside `server/`. The end-to-end specs drive the real client against the real server,
  and `engine/ui/__tests__/api.test.ts` keeps its scripted `fetch` for the failures a real server
  cannot be made to give.
- Merging the server tests that looked alike. Read closely, the sign-out, malformed-cookie, PIN and
  row-level security tests in different files each prove a different fact. The one real repeat, a
  foreign origin refused in `config.test.ts` and again, with more cases, in `auth.itest.ts`, is now
  only in the second, and the email test that checked the keys of its own input now checks the body
  that is sent.

## What is left

The end-to-end tier runs only on a laptop. Moving it to CI needs:

- Linux screenshot goldens. The 32 under `tools/e2e/games/*-snapshots/` are drawn on a Mac's GPU and
  named `-darwin`.
- The bundled Chromium instead of installed Chrome (`channel: "chrome"` in three projects), or Chrome
  installed in the runner.
- A clean-up through a database URL instead of `docker exec lumischool-pg`.
- Waits on what the page shows instead of `waitForTimeout`, which most game specs use for 300 to
  3,000 ms.
- Fewer specs that win a level from the keys, which replays rules `school/games/__tests__/` already
  proves; one table-driven spec that drives each game by pointer, touch and drag would replace them.
- A `test` profile in `docker-compose.yml` that runs Postgres on 8507 (the port `local.md` reserves),
  the built server and Playwright's image, so a laptop and CI run the browsers the same way.

## Open decisions

- Whether Render deploys only after CI passes. `autoDeployTrigger` in `render.yaml` can wait for
  passing checks instead of deploying on every commit, which would make CI a gate rather than a report.
- Whether the nightly end-to-end run, once there is one, keeps all four device projects. We have not
  measured what each project finds that the others miss.
- Where the Maestro flows run once there are more of them: a hosted device service, or by hand before
  each TestFlight build.
