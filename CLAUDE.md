# lumischool

A homeschool platform for children aged 5 to 10 and the grown-ups who teach them. Lessons are
written in a small notation, checked for every value a question can take before a child sees them,
and drawn in one hand-drawn style on 5 mm squared paper, on screen and in print. The prototype of
every surface is in `.scratchpad/`, and the product is being built at the root in the shape that
[.docs/structure.md](.docs/structure.md) sets out.

## Read first

- [.docs/README.md](.docs/README.md) is the index of the design documents. Read the one for the
  area you are about to touch before writing code in it.
- [.docs/structure.md](.docs/structure.md), the section "Decided: the shape we build to", says where
  every file goes and who may import whom. If something does not fit it, change the document in the
  same change rather than inventing a folder.
- [.docs/db.md](.docs/db.md) and [.docs/data-model.md](.docs/data-model.md) for the nine
  tables, [.docs/auth.md](.docs/auth.md) for sign-in, [.docs/local.md](.docs/local.md) for ports and
  for running things.

## The shape

```
apps/      kids · home · studio · site           screens and entry points, no logic of their own
engine/    paper · numbers · expr · answer · scene · pack · space · ink · parts · sound · motion · notation · ui
school/    lessons · games · worlds · year · record · family · assistant · studio
server/    http · auth · sync · email · db
content/   curriculum · art                      data, read through one loader each
tools/     scripts · e2e
```

- A module named after the machine goes in `engine/`; one named after something a family would
  recognise goes in `school/`. There is no `src/`, and nothing else sits at the root but the design
  documents, the config files and the scratchpad until it is empty.
- A module is one file until it holds a second concept, and then it is a directory of files. There
  are no `index.ts` barrels: import the file that holds the thing.
- Only `engine/ui/` touches the page. Only `server/` imports `server/db/`. The apps never import
  `server/`, and only the studio imports `engine/notation/`.
- `boundaries.ts` declares who may import whom, and its check fails the build; `tools/scripts/check-db.ts`
  already enforces the database's part.
- Imports across drawers are relative for now (`../../engine/answer`); aliases are still to come.
- Drawings live in `engine/parts/` and the notation compiler in `engine/notation/`. Production
  code and tooling never import the ignored scratchpad.
- Every test suite lives in a `__tests__/` folder in the directory that holds the code it tests, such
  as `server/db/__tests__/` or `engine/ink/__tests__/`; a drawer's own `__tests__/` holds the suites
  for its single-file modules. Test helpers live there too. `*.test.ts` needs nothing, `*.itest.ts`
  needs Postgres, and `tools/e2e/` holds the tests against the running apps. The scratchpad keeps its
  `test/` folder until its modules move out.
- New prototype pages still go in `.scratchpad/`. Code meant to ship goes into the root shape, and a
  module that moves out of the scratchpad is deleted from it in the same change.

## Files

- One long file per concept, not many small files. Length is not the test: a file that holds one
  concept stays one file however long it gets. Split when a second concept has moved in, not when
  the file gets long, and do not split a helper out of a concept into a sibling file.
- Export only what another file consumes. When the last consumer of an export goes, drop the
  keyword in the same change.
- Code nobody uses is deleted with the whole path that served it, not hidden behind a flag or left
  as a stub. The git history is where "for later" lives.
- The apps and `engine/ui/` are SolidJS. A component is a `.tsx` file, and logic a test should
  cover goes in a `.ts` file beside it, since Node's test runner strips types but not JSX.
- An import names a module without a file extension: `from "./client"`, never `"./client.ts"` or
  `"./client.js"`. A stylesheet keeps its `.css`, since it has no other name. The TypeScript config
  refuses a `.ts` extension in an import, the lint refuses any other extension, and Node runs the
  root's scripts and tests through a resolver that finds the file,
  so the same import works in the type checker, the bundler, scripts and tests. The scratchpad keeps
  its current imports until each module moves out of it.

## Comments

Keep them minimal. Names and types carry the meaning, and a comment says only what the code cannot:
why it is this way, an invariant, a unit or a range, a trap, or a value that must stay in step with
another file. Before keeping a comment, ask whether deleting it would let someone undo a decision
they should not. If it would not, delete it.

- No file-header essays, no section banners (`// ---- shapes ----`), no comments that restate the
  code, and no build phases or dates.
- One line, unless the why genuinely needs two. A comment that runs on is usually a paragraph the
  code did not ask for, or reasoning that belongs in `.docs/`.
- In a stylesheet the property and its value already say what. A comment says why this number and
  not another, once, above the rule rather than beside each declaration.
- Write for someone who never saw the change. A comment that says what a value used to be, or that
  a rule is new, reads as noise to everyone after you: say why the value is what it is, and leave
  what it was to the history.
- Design reasoning belongs in `.docs/`, and a comment can point there.
- `TODO` is fine when it names what is missing.

## Formatting and lint

Prettier formats all code and config, with the settings galleo uses: four spaces, double quotes,
semicolons, a width of 100 and trailing commas (`.prettierrc`). Run `npm run format` rather than
formatting by hand. Markdown is not formatted by Prettier, so the documents keep the wrapping they
were written with.

The lint is oxlint with type information (`.oxlintrc.json`), carrying galleo's ESLint rules and the
rules that catch an unannounced `any`. It is not ESLint because typescript-eslint does not run on
TypeScript 7, which has no JavaScript API for it to use, and oxlint's type-aware mode is built on
TypeScript 7 itself. Warnings fail the run.

## Types

TypeScript is strict, with `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`,
`noFallthroughCasesInSwitch`, `verbatimModuleSyntax` and `erasableSyntaxOnly`. Node runs the `.ts`
files directly, so there are no enums, namespaces or parameter properties; a union of string
literals does the job of an enum.

There is no `any`. It is not written, not cast to, and not received quietly: oxlint's type-aware
rules fail when a value typed `any` flows into anything, which catches `JSON.parse`, a response body
and an untyped library. Input from outside the program is `unknown` until a checker has read it and
returned either a typed value or a problem, the way `check` in `engine/answer.ts` does for events.
Past that edge, code trusts its types.

There are no escape hatches. `tools/scripts/check-suppressions.ts` finds them in every file git lists,
tracked or not, including files the lint skips. It looks for:

- `eslint-disable` or `oxlint-disable` comments, including one inside a block comment of many lines
- `@ts-ignore`, `@ts-expect-error` or `@ts-nocheck`
- `prettier-ignore`, and coverage pragmas
- `as unknown as`
- a non-null assertion `!`, and an explicit `any`, which the lint also catches at the root: check the
  value and handle the missing case, or restructure so it cannot be missing
- an unused binding is named `_name` rather than silenced

A plain `as` is for widening, or for a DOM element the page itself put there; narrowing data is a
checker's job. If an escape hatch is genuinely right, add the file to `ALLOW` in the guard with the
reason, so the exception is reviewed.

Every shape is declared once, and the database is where most of them start.

- A row's type is inferred from its table in `server/db/schema.ts` (`typeof kids.$inferSelect`, and
  `$inferInsert` for writes), exported beside the table under its singular name: `Family`, `User`,
  `Member`, `Kid`, `Key`, `Event`, `Content`. No other file writes a row's columns out again.
- A row's fields are named as its columns are, in snake_case (`family_id`, `kid_id`, `seen_at`), in
  Postgres, on the wire and in TypeScript, so a row is the same object
  everywhere and nothing maps names between layers. Timestamps in a row are strings in one
  canonical format, recorded in [.docs/db.md](.docs/db.md). Everything that is not a row
  field (variables, functions, other objects' properties) is camelCase.
- Any module may `import type` a row type from `server/db/schema.ts`. A type import is erased at build,
  so the database client still never reaches a browser.
- A narrower shape is derived rather than restated: `Pick<Kid, "id" | "name">`, `Omit<...>`,
  `Kid["id"]`.
- What lives inside a `jsonb` column is declared in `answer.ts` (an event's data, by kind) and typed
  into the column with `$type<>()`, so the column and the code cannot disagree. `Envelope` there is
  the events row split by kind, and a type test in `server/db/` fails if it drifts from the table.
- A set of cases is a union, and the code that handles every case is a `Record` keyed by that union,
  so a new case without its handler is a type error. `EVENT` and `GIVEN` in `engine/answer.ts` are
  the pattern.

## Rules the product depends on

- Light only. There is no dark mode and no `data-theme`; one palette, in `engine/ui/palette.css`.
- Every drawing is on the art shelf. The shelf's catalogue is the one list of drawings that lessons,
  worlds, games and pages draw from, so a new drawing gets its catalogue entry, its shelf grouping
  and its description in the same change, and a test fails on any drawing defined anywhere else.
- Services are self-hosted. Detailed weekly letters send child names and learning summaries through
  Resend only when the receiving parent explicitly enables them; private-link letters contain no
  learning details. Authentication mail never contains child data. Model inputs remain governed by
  `school/assistant/envelope.ts`.
- Sync is ours and small: a child's view keeps unsent answers in a short queue in the browser and
  sends them in chunks through `withFamily`, where `id` makes a resend harmless and the server
  stamps `device` and `seq`, one stream per kid session. No copy of the log is kept on a device,
  and there is no replicated local database and no third-party sync engine.
- Nothing that runs on a child's device imports `server/` or `engine/notation/`.
- A family's rows are unreachable from another family. Every table with `family_id` has row-level
  security forced, and every query goes through `withFamily` in `server/db/client.ts`.
- Events are appended and never updated. Progress, rewards and plans are worked out from them and
  not stored.
- Touch targets are at least 44 px, and everything that moves stops under `prefers-reduced-motion`.
- Text a person reads, on screen, in email or in `.docs/`, has no em-dashes.
- Ports come from the 85xx block and are fixed. A new port gets its row in `.docs/local.md` in the
  same change that starts using it.

## Commands

At the root:

- `npm run dev`: the API, and the dev server that serves every app on one origin,
  `http://localhost:8500`, with the child's app under `/kids` and the API under `/api/`.
- `npm run check`: type check, lint, format check, the guards and the tests. It has to pass before
  work is called done.
- `npm run format`: format everything Prettier covers.
- `npm run lint`: oxlint, type-aware, with warnings failing the run.
- `npm run check:suppressions`: the escape-hatch guard on its own.
- `npm run check:boundaries`: who may import whom, from the table in `boundaries.ts`, over every root
  import.
- `npm run check:voice`: the rules on what the world's guide may say (`school/voice.ts`), over every
  line it can say: the fixed lines, the worlds' lines, and every hint and rule line of the curriculum.
- `npm run check:db` and `npm run test:db`: the database guard, and the database's tests.
- `npm run test:e2e`: the end-to-end tests in `tools/e2e/`, against `npm run dev` already running, as
  [.docs/local.md](.docs/local.md) describes. It is not part of `npm run check`.
- `npm run db:up`, `db:reset`, `db:psql` and the rest are described in
  [.docs/local.md](.docs/local.md).

In `.scratchpad/`: `npm run dev`, `npm run check`, `npm test`, `npm run check:print`.

Commit only when asked.
