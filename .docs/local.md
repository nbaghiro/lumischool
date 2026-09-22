# Running lumischool locally

What runs on a developer's machine, on which ports, how to start each piece, and what to do when one
of them will not start. The database is described in full in [db.md](db.md); this document says
only enough about it to get it running.

## What runs, at a glance

| What | Port | How to start it | State |
|---|---|---|---|
| Postgres, the dev database and the test database | 8502 | `npm run db:up` at the repo root | Built |
| The scratchpad (every prototype page) | 8508 | `npm run dev` in `.scratchpad/` | Built, moving from 5173 |
| The print check's headless Chrome | 8509 | started by `npm run check:print` | Built, moving from 9354 |
| The API server | 8501 | `npm run dev:api` at the repo root, or `npm run dev` with the apps | Built, first slice ([api.md](api.md)) |
| The dev server for every app, on one origin | 8500 | `npm run dev` at the repo root, which starts the API too | Built |
| Redis | 8503 | not yet | Reserved, and not needed |
| A separate test Postgres | 8507 | not yet | Reserved, if tests move off the shared container |

Two of the rows above say "moving". The scratchpad still serves on 5173 and the print check still
drives Chrome on 9354, because several agents are running scripts against those ports this week. Both
move once those runs finish, and this document will be updated when they have.

## Ports

We run everything locally on the host ports from 8500 to 8599. The block was chosen because nothing
else on this machine uses it: a survey on 12 September 2026 of every project under `~/Documents/code`
and `~/PocketSuite` found galleo in the 8600s, clientbridge in the 8700s, llamatrade in the 8800s and
sourcewell in the 8900s, with flowmaestro, PocketSuite and beautifulai on the conventional defaults,
and nothing declared or listening anywhere in 85xx. Every lumischool process takes a fixed port from
the block and refuses to start if that port is taken, rather than drifting to the next free one,
because a server that quietly moves to 5174 is a server that is now answering on flowmaestro's port.

| Port | Use |
|---|---|
| 8500 | Vite dev server for every app on one origin, proxying `/api/` to 8501 |
| 8501 | API server |
| 8502 | Postgres, holding `lumischool` and the tests' own databases |
| 8503 | Redis, reserved for when a job needs it |
| 8504 to 8506 | free again, since the apps share one origin |
| 8507 | a separate test Postgres, reserved |
| 8508 | the scratchpad's Vite dev server |
| 8509 | the print check's headless Chrome |
| 8510 to 8529 | free again: the world canvas lead's 8521 and 8522 went with the place's prototype, and a child's view is driven by `tools/e2e/family.e2e.ts` against 8500, since the API accepts state-changing requests from that one origin and the e2e's own steps hold the session |
| 8530 to 8560 | free again: the site lead's own dev server has been stopped, and the day section is looked at on 8500 like any other page |
| 8561 | the art shelf's golden and A/B compares (`.scratchpad/scripts/golden.mjs` and `golden-ab.mjs`), each on a Vite server of its own |
| 8562 | the scratchpad served for the art shelf's scoped print and signed-out checks, started after the files it checks |
| 8563 to 8599 | free |

Three rules keep the block honest. A port is a fixed number, set with `strictPort` or its equivalent,
so a clash fails loudly. Every port can be overridden from the environment, so a second checkout can
run beside the first without editing a file. And a new service claims its port by adding a row to the
table above in the same change that starts using it; a port that is only in code is a port the next
person will collide with.

## Before you start

- Node. The scratchpad and the database module are run on Node 25 today, and both use Node's built-in type
  stripping and test runner, so an older Node that lacks either will fail in confusing ways. We have
  not pinned a version yet; `.node-version` is planned in [structure.md](structure.md).
- Docker, for Postgres. Docker Desktop 29 is what has been used.
- npm. The scratchpad and the root each have their own `package.json` and lock file today.
  [structure.md](structure.md) names pnpm for the eventual workspace, and which one we use is still an
  open decision.
- Google Chrome at its usual path, for `check:print`. Set `CHROME` to use another binary.

## Docker Compose

`docker-compose.yml` at the repo root has one service, which `db:up` starts.

| Setting | Value |
|---|---|
| Image | `postgres:18`, pinned to the major version, matching the Neon project this deploys to |
| Container | `lumischool-pg` |
| Host port | 8502 on 127.0.0.1 only, mapped to the container's 5432, since the local passwords are in the repository |
| User, password, database | `lumischool` / `lumischool` / `lumischool`, for local use only. This is the owner, which runs migrations |
| App role | `lumischool_app` / `lumischool_app`, what everything else connects as. It cannot bypass row-level security; its local login comes from `server/db/migrations/local-roles.sql`, which the container runs when the volume is new and `db:up` runs every time |
| Volume | `lumischool-pgdata`, a named volume, so the data survives `db:down` |
| Healthcheck | `pg_isready` every five seconds, ten tries |

The tests' databases live on the same container, one per test process, named `lumischool_test_<pid>`,
so two runs at once never drop each other's. Each run drops the ones whose process has ended.

There is no Redis and no second service. [db.md](db.md) records the trigger that
would add one: the first job that has to survive a restart and must not run twice, such as rendering a
PDF. Even then, a jobs table in Postgres using `for update skip locked` comes before a new container.

## The database scripts

All run at the repo root.

| Script | What it does |
|---|---|
| `npm run db:up` | Starts the container, waits for the healthcheck and gives the app role its local login; fails if it is not ready in 30 seconds |
| `npm run db:reset` | Drops everything in `lumischool`, then migrates and seeds |
| `npm run db:migrate` | Applies every migration not yet applied; a second run does nothing |
| `npm run db:seed` | Seeds one family from the real content with invented attempts, through the app role; a second run writes nothing |
| `npm run db:demo` | Seeds the demo family, the Harlows, with half a school year that ends on the last weekday before today and a family PIN of `2468`; a second run writes nothing, and `-- --fresh` writes it again with current dates. It runs `tools/scripts/demo-work.ts` against the root notation engine and game prover; no scratchpad installation is needed |
| `npm run pack` | Compiles every lesson of `content/curriculum/` into the pack the API serves (`tools/pack.ts`, `engine/pack.ts`), under `dist/pack/`, or the folder given as its argument. It compiles in process from `engine/notation/` (since 22 September 2026; before that it ran `.scratchpad/scripts/pack-work.ts`, which needed the scratchpad's `npm install`). The API reads the pack when it starts and again whenever `dist/pack/current` changes (`watchPack` in `server/pack.ts`), so a running API serves a new pack a moment after it is built, and nobody restarts it by hand |
| `npm run db:psql` | Opens `psql` inside the container, as the owner, which sees every family |
| `npm run db:down` | Stops the container and keeps the volume |
| `npm run db:generate`, `db:check` | Drizzle's migration generator and drift check |
| `npm run check` | Type check, lint, format check, the suppression and database guards, the database, server and client tests, a production build of the three apps into a temporary directory that is removed after (`check:build`), and the check that the children's build names no grown-ups' route (`check:kids-build`) |
| `npm run lint` | oxlint with type information; any warning fails it |
| `npm run format` | Prettier over all code and config (`format:check` only reports) |

The first time: `npm install`, `npm run db:up`, `npm run db:reset`. Without a running database the
tests skip with a printed reason, so a checkout with no Docker still passes `npm run check`; setting
`LUMISCHOOL_REQUIRE_DB=1` makes them fail instead, which is what CI should do.

Nothing at the root built without `.scratchpad/` until 22 September 2026, since the apps drew through
the seam into it ([structure.md](structure.md), "The order from here"). The seam is gone, and
`npm run build`, `npm run pack` and `npm run db:demo` use root modules only. The demo worker lives
in `tools/scripts/demo-work.ts`, so a fresh clone needs no `.scratchpad/`.

## The scratchpad

The scratchpad is the prototype of every surface, in `.scratchpad/`, with its own `package.json`.

| Script | What it does |
|---|---|
| `npm run dev` | The Vite dev server, today on 5173 and moving to 8508 |
| `npm run check` | Type check, the art conventions guard, the privacy guard and the tests |
| `npm test` | The tests on their own |
| `npm run build` | `check`, then a production build of every page |
| `npm run check:print` | Prints every lesson in headless Chrome and checks each one prints exactly its own sheets |

`check:print` needs the dev server running, since it opens each lesson from it. It skips with exit 0 if
nothing is serving, starts its own Chrome with a throwaway profile, and restarts that Chrome once if a
print fails before recording a finding. A run over the whole corpus takes a few minutes.

The pages the scratchpad serves are listed in its top bar, in three groups: what the lessons are made
of (Art shelf, Notation, Drawing pad, Guides), what they are made into (Lessons, Games, Engine, Music,
Journey, Journal), and who uses them (Parents, Assistant, Site, Architecture). The list is one
declaration in `.scratchpad/src/core/chrome.ts`, and `.scratchpad/test/pages.test.ts` fails if a page
is missing from it.

## The API server

`npm run dev:api` starts `server/http.ts` on 127.0.0.1:8501 and refuses to start if the port is taken, printing the `lsof` line that shows what holds it. It sets `LUMISCHOOL_ENV=local`, which the server needs before it will start at all. A sign-in code is printed in the server's terminal, since only the console email transport is built.

The apps call the API through the dev server on 8500, on one origin, as the next section describes. The scratchpad's own pages still call it through the scratchpad's dev server on 5173, which proxies `/api` to 8501 (`.scratchpad/vite.config.ts`), and the API accepts that origin locally beside the two apps' hosts. On any host the API also keeps the two sides apart by route, reading only the children's view cookie on `/api/kid/*` and only the session cookie everywhere else.

## The apps

`npm run dev` at the repo root starts the API on 8501 and one Vite dev server on 8500. An API that is already running is left alone, so it can run beside `npm run dev:api`, and the API's lines, sign-in codes included, print in the same terminal. `npm run dev:web` starts the web server on its own.

The dev server has hot reload off (`server.hmr: false` in `vite.config.ts`), so a file saved while a page is open changes nothing on that page until it is loaded again by hand.

Everything is one origin, as galleo serves its own app and API ([auth.md](auth.md), "Hosts"):

| Path on `http://localhost:8500` | What it serves |
|---|---|
| `/api/` and below | The API on 8501, passed through unchanged, `Origin` included |
| `/favicon.svg`, `/favicon-16.png`, `/favicon-32.png`, `/apple-touch-icon.png`, `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png` and `/social.png` | The logo's files, which `tools/brand.ts` makes from `engine/parts/brand.ts` the first time one is asked for, and which the build writes beside the apps ([brand.md](brand.md), "Using the files") |
| `/kids` and below | The children's view, `apps/kids`: a card that asks for a grown-up when this browser holds no children's view, the children's pictures, and each child's page |
| `/home` | The site, `apps/site`, for everyone: where the logo on the grown-ups' screens goes |
| `/` | The grown-ups' app, showing the family's page, for a browser with a session cookie; the children's view for one with only a children's view cookie; and the site otherwise |
| every other path | The grown-ups' app, `apps/home`: `/sign-in`, `/start`, Explore at `/explore` with each lesson at `/explore/<lesson>`, the map of every world at `/map` (a world at `/map?world=<id>`, a lesson in its world at `/map?lesson=<id>`), and the local outbox at `/outbox`, which is a missing page anywhere but on this computer |

A page path is answered with its app's one page, and the app shows the screen the path names. `server/pages.ts` decides which app answers a path, and `vite.config.ts` routes with it the way the server will once it serves the builds. For `/` it sees only whether the session cookie, or failing that the children's view cookie, is there; the API clears a cookie it refuses, so after a `db:reset`, which ends every session and every children's view, a browser shows the sign-in page or the card that asks for a grown-up once, and then the site at `/`. Open the apps at `localhost`, not `127.0.0.1`, since the API accepts state-changing requests from `http://localhost:8500` only.

Only the site, at `/home` and at `/` for a visitor, draws the sample child: its map with the child's path, place and dated stamps. The child's journey and the site's words about the child are worked out when the apps are built, by `tools/first-view.ts`, which the dev server answers at `/@site-data.json` instead, so the opening map loads no curriculum. The sections below it read the visitor's pack once the opening map is drawn, since the site's rebuild (22 September 2026); before it they parsed the whole curriculum through the seam. The map behind the sign-in pages, the family's page and the children's view is the country with nobody on it, every world and the ways between them with no child's path, place or stamps, and it loads no curriculum.

The site's data and its visitor pack are compiled from the curriculum on the dev server's first request for them after a change to `content/curriculum/`, about fifteen seconds, and served at `/@site-data.json` and `/@site-pack/`; the build writes the same under `dist/assets/`. Each compile is kept under `node_modules/.cache/site-pack/<hash of the curriculum's text>/`, so a restart and every build of one `npm run check` read it back; `rm -rf node_modules/.cache/site-pack` makes the next one compile again.

Until a page's live map is drawn, its box shows the map's squared paper and a snapshot of the map from `engine/ui/snapshots/`, placed where the live map will draw and grown about the place it looks at until it covers the box, and the live map fades in over it once the page is idle and the map is drawn. If the live map's code fails to load, as it does when the dev server has restarted under an open page, the page loads itself again once rather than staying on the snapshot. When the map's look changes, `npm run map:snapshots` draws the snapshots again in Google Chrome, and `node --import ./tools/scripts/resolve.ts tools/scripts/map-snapshots.ts --compare` builds the apps and measures each snapshot against the live map it stands in for. `npm run test:tools` draws each snapshot again and fails when one no longer matches the map as it draws now; it skips that case on a computer without Google Chrome or without `.scratchpad/`.

No email leaves this computer. The console transport prints each email in the API's terminal and keeps the last twenty in memory, `GET /api/dev/outbox` returns them while the server runs locally, and `/outbox` shows them, so to read a sign-in code, open `http://localhost:8500/outbox` in another tab. The code step also accepts the fixed code `12345678` for any address a code was just asked for on that browser, which the server refuses outside local ([auth.md](auth.md), flow 2). The sign-in screens look the same everywhere.

The Harlows are ordinary data that `npm run db:demo` writes ([api.md](api.md), "Seeded data"), and their parents sign in the way anyone does. To sign in as one of them by hand:

1. Open `http://localhost:8500/sign-in`, type `demo-parent1@lumischool.ai` for Anna Harlow or `demo-parent2@lumischool.ai` for Ben Harlow, and press Send me a code.
2. Type the fixed local code `12345678`, or open `http://localhost:8500/outbox` in another tab, or look in the API's terminal, and type the newest code sent to that address. The family's page opens with Rosie, Leo and Ivy.
3. To open the children's view, press Open Rosie's view on the family's page. The browser is signed out and opens `/kids` on Rosie's page. To add Leo and Ivy, hold the Grown-ups tab for two seconds, type the family PIN, 2468, and press Add Leo, then the same for Ivy; the view then opens on the children's pictures, and tapping a picture opens that child's page.
4. To leave it, hold the Grown-ups tab for two seconds and type the family PIN, `2468`, which the seed sets; the family's page opens again as a shared session. Sign in instead also leaves it. A browser holds a grown-up's session or a children's view and never both, so to watch both sides at once, open the view in a second browser profile or a private window.

When the seed changes, `npm run db:demo -- --fresh` writes the Harlows again with current dates.

The API's limits apply locally too: a sign-in code once a minute and three in fifteen minutes for one address, and twenty unused codes of any kind from one network. An unused code counts until it is an hour old, so repeated runs on one computer can meet the limits; the end-to-end tests clear the expired ones before they start. The family PIN counts its own wrong tries, and after fifteen in a row it stops until a parent signs in and sets it again on the family's page.

In production one Render service serves the same paths on one domain, with Neon for Postgres, as [auth.md](auth.md) sets out.

## The end-to-end tests

`npm run test:e2e` runs `tools/e2e/` against the running apps, with `npm run dev` serving 8500 and the Harlows seeded by `npm run db:demo`. It drives the installed Google Chrome through Playwright (`channel: "chrome"`) at a laptop's, an iPad's and a phone's size, one case at a time, and downloads no browser (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`). Before any case runs it checks that the apps are serving and the Harlows are in the local database, and through the local container it clears the sign-in and confirm codes that nobody used and that have expired, since those count toward the API's limits for this computer's network, and the children's views and wrong PIN tries earlier runs left in the Harlows' family. The family cases answer Rosie's sheet for today and chain within a device, so the work the Harlows' children did today is cleared again at the start of each device's run of them (`clearToday` in `tools/e2e/ready.ts`); without it the iPad and the phone met the laptop's answers. It is not part of `npm run check`, because it cannot start what it needs.

A case is a `*.e2e.ts` file in `tools/e2e/`. The steps the cases share are in `tools/e2e/steps.ts`: `signInAs` for a case that only needs a seeded parent signed in, which signs them in with the fixed local code on a page of its own once for each project and puts that session into later cases while it still works (one case still signs in with the code read from the outbox), `askForCode` with `typeCode` for a case that goes through the code flow, and `atScreen`, which waits for a screen and fails as soon as the page shows the card a screen shows when its code did not load, rather than loading the page again past it. `grown-ups.e2e.ts` fails if any grown-ups' screen shows that card. A case takes `test` from `steps.ts` rather than from Playwright, and a second device from `newDevice`, so that its pages take no hot updates from the dev server: a file saved during a run would otherwise swap modules under an open page and can leave it on a stale or empty screen.

## Environment variables

None is needed for local work. `.env.example` at the root lists the database module's.

| Variable | Default | Used by |
|---|---|---|
| `DATABASE_URL` | `postgres://lumischool:lumischool@localhost:8502/lumischool` | the database module's owner connection (migrations, the catalogue), for anything that is not the local container |
| `APP_DATABASE_URL` | `postgres://lumischool_app:lumischool_app@localhost:8502/lumischool` | the app role, which `withFamily` connects as, for anything that is not the local container |
| `DB_CONNECT_TIMEOUT`, `DB_STATEMENT_TIMEOUT` | `10` seconds, `10000` milliseconds | the app role's pool: how long it waits for a connection, and how long any one statement may run, set per transaction by `withFamily` |
| `LUMISCHOOL_REQUIRE_DB` | unset | the database tests; set to 1 in CI so they fail rather than skip |
| `LUMISCHOOL_ENV` | unset | the API server, which starts only when it is `local`, since only the console email transport is built; `dev:api` and `dev` set it |
| `API_PORT`, `API_HOST` | `8501`, `127.0.0.1` | the API server, to run a second checkout beside the first. Locally the host must be a loopback address, and the server refuses to start otherwise, since the local routes answer only on this computer |
| `APP_ORIGIN` | `http://localhost:8500` | the one origin: the API server's `Origin` check and its CORS answers; locally it also accepts the scratchpad's `http://localhost:5173` |
| `AUTH_PEPPER` | a fixed local value | the API server's key for sign-in codes, the family PIN and network hashes, which is never in the database; required once the server runs anywhere but locally, and the demo seed hashes the Harlows' PIN with the same local value |
| `PACK_DIR` | `dist/pack` | the API server, for the pack `npm run pack` wrote (`tools/pack.ts`); without one the API starts and says so, and the routes that serve lessons and a child's record answer `503` |
| `AUTH_DEV_CODE` | `12345678` | the API server's fixed code, which the code step accepts beside the emailed one; eight digits, and the server refuses to start with it set anywhere but locally |
| `PRINT_BASE` | the scratchpad's dev server address | `check:print`, to print against another server |
| `CHROME` | Chrome's usual macOS path | `check:print`, to use another Chrome |

The port overrides for the scratchpad and the print check's Chrome arrive with their move to 8508 and
8509, and will be added here then.

## When something will not start

A port is taken. Find out what holds it with `lsof -nP -iTCP:<port> -sTCP:LISTEN`. On this machine the
usual culprits are a headless Chrome left behind by a screenshot script, and an old local static server
from a previous session. Stop the process only once you have checked it is yours; the other projects'
servers are often running on purpose.

The dev server came up on a different port. That is Vite drifting because the fixed one was taken,
which the move to 8508 with `strictPort` is meant to end. Until then, check the address it printed
before assuming it is the scratchpad.

The database is not healthy. `docker ps --filter name=lumischool` shows its state and `docker logs
lumischool-pg` shows why. A container that was stopped keeps its data; `npm run db:reset` rebuilds the
contents without touching the volume, and removing the volume is the one step that loses the seed.

The database tests skip. That is the intended behaviour with no database running; bring the container up
first.

## The neighbours

So that a new port is never taken from another project by accident. Taken from the survey on
12 September 2026; the full table with file and line references is in the survey's report.

| Project | Ports |
|---|---|
| galleo | 8600 to 8611, and 8697, 8698 and 8777 for its local tools |
| galleo-explorations | 8791 |
| clientbridge | 8700 to 8709, and 8899 |
| llamatrade | 8800 to 8890 and 8990, plus 5442, 5443, 6389 and 9092, and test and monitoring ports |
| sourcewell | 8900 to 8906 |
| flowmaestro | conventional defaults: 3000, 3001, 5432, 5433, 6379, 7233, 8080, 8088, 27017, and 5174, 5175 |
| PocketSuite | 80 and 443 through nginx, 3000, 4321, 5001, 5432, 6379, 8080, 8888 to 8891 |
| beautifulai | 3000, 3030, 5432, 6006, 8080, 9180 to 9194, 9200 to 9231 |
| nbaghiro | 3100, 5283 |
| branchpad | 17600 to 17999 |
| carbonmodes | 9292 |
