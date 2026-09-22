# Review

Status: reviewed on 21 September 2026, before anything was deployed or committed. This document records a full read of the root tree, drawer by drawer, and lists what it found: the state of the checks, the correctness gaps with the input that shows each one and what to do about it, the improvements worth making, and what was read and found sound. It is written to be executed from, so the last section is an order of work with a box per item. Deployment on Render and Neon is [deploy.md](deploy.md).

How it was done: the server, the database module and the migrations were read in full by one reader, and four others took the engine, `school/`, the client side and the tooling, each told to confirm a finding by re-reading the code and, where it was cheap, by running a script against the module before reporting it. Every item below was confirmed one of those two ways, and each says which. `npm run check` was run twice. The tree was being edited on disk throughout, so a line number is as of that afternoon and may have moved.

## The short version

- The full check was red on one test: the child's map screen was over its script budget by a few hundred bytes. Everything else passed, one further failure seen during the review was mid-edit state that went away on a re-run, and the budget red cleared the next day without being raised (see the state of the tree).
- The most serious gap is in the child's queue: any 4xx it does not recognise, a proxy's HTML page included, drops the whole chunk of answers and reports nothing unsent, and a `not-found` empties every queued answer of that child. A failed write to the queue is also ignored by the lesson, which shows the question as taken.
- A typed decimal or fraction is checked as text against the rendered answer, so a child who types `3.1` for a price rendered as `3.10` is told to have another look. One live item does this today.
- The folds have four disagreements with what the pages promise: two sittings of one lesson on one day share every attempt, marking a paper writing or painting sheet records the piece as right, a by-eye lesson folds to nought right and reads as revisit, and the reward's moment lands a week before the change that made it happen.
- The edge check holds the shape of an event and nothing else: a 900 kB note, a negative number of minutes, an event dated in the year 9999 and a data object with keys nobody declared all pass, and an event is never updated once it is in.
- Three guards are weaker than the documents say. The database guard reads only the statements that add security, so a later migration that disables it passes. The suppression guard misses three escape hatches TypeScript honours. Index barrels and triple-slash references are enforced by nothing at all.
- The engine has eight confirmed defects, all reached through authored content rather than a child's typing: a wrong count that refuses valid plank items, expression values the evaluator never makes but the checker accepts, five plain-object lookups that hit `Object.prototype`, two loops with no bound, and a window of nought that never returns.
- Isolation, sign-in, the family lock, the limits, the cookie rules, the origin check, the boundary check and the queue's idempotency were all read closely and found to hold.

## The state of the tree

`npm run check` fails at `test:tools`: the test at `tools/__tests__/first-view.test.ts:253` measured the child's map screen at 380,484 bytes of script before the drawings, against a budget of 380,000, and at 381,933 on an earlier run the same afternoon. The number moves with the edits, so it is a budget to raise or a chunk to trim, not a stale build. Because the check stops there, `test:apps`, `check:build` and `check:kids-build` were run on their own and pass.

That red cleared on 22 September 2026, when the notation engine and the catalogue flip landed: the child's map screen is now 35 bytes under its budget, which was not raised.

`check:kids-build` failed once on two exports missing from `school/worlds/view.ts` that `apps/home/school.ts` imported, and passed twenty minutes later. That was the tree mid-edit, and it is recorded here only so nobody chases it.

The branch has no commits. Two rules in the documents lean on the history: CLAUDE.md sends deleted code there, and db.md's rule that a migration which has left the machine is never edited has nothing to anchor to until there is a first commit.

## Correctness gaps

Each item names where the defect is, the input that shows it and what it does, and what to do. Confirmed by running means a script reproduced it; confirmed by reading means the code was re-read and the path traced.

### The child's queue

1. An unrecognised 4xx drops the chunk. In `engine/ui/kid.ts:267-287`, `sendAll` retries only `offline`, `rate-limited` and a status of 500 or more, treats `no-kid-session` as the end of the view, and sends everything else to the branch that drops the chunk as refused by rule. `call` in `engine/ui/wire.ts:216-220` turns any 4xx whose body is not our JSON into `{ error: "server", status }`, so a proxy's HTML 403, a WAF's plain-text 429 and our own `403 origin` after an origin mismatch all reach that branch, the chunk is deleted, and `unsent` reads nought. A fake API answering each of those for one POST left nothing stored and nothing reported unsent. Confirmed by running. The fix is to drop only when the failure names an event by `at`, and to keep the chunk and wait with the backoff for every other 4xx, so a stuck queue at least shows in `unsent`.

2. A `not-found` empties the child's whole queue. `engine/ui/kid.ts:283-285` drops every queued row of that kid, chunks not yet sent included, and `server/http.ts:908-909` answers `not-found` as our own JSON for any path that matches no route. A route renamed during a deploy while a tab is open therefore wipes that child's unsent work on the first send. Reproduced: sixty events queued for one child and two for another, one 404 on the first POST, then normal service, and none of the sixty reached the server. Confirmed by running. Drop only the event named, or nothing.

3. A failed `record` is ignored by the lesson. `engine/ui/kid.ts:320-345` returns `{ problem }` for a draft that fails the check or is over 256 kB, and rejects when the IndexedDB write throws, with no fall back to memory once the database has opened. `apps/kids/lesson.tsx:130-148` calls `record` with `void` and, in `finished`, ignores a `{ problem }` and still returns true, so the sitting is reloaded as ended. The sheet's own state is set before the call, so the child sees a ticked question that was never queued. Confirmed by running for `record`, by reading for the callers. The lesson should read the result, and a storage failure should fall back to the in-memory queue and be shown.

### Checking answers and folding the record

4. Typed numbers are compared as text. `school/lessons.ts:224-228` marks a typed answer right only when its normalised text equals the pack's rendered answer, which keeps the notation's display hint. `content/curriculum/items/g4-missing-price.lumi` renders `3.10`, so `3.1` is wrong; `g3-tenths-shaded.lumi` renders `0.7`, so `.7` is wrong; `7` against `7.0` and `1/2` against `0.5` likewise. `valueOf` at `:147-157` already parses the text into a value for the rules, and `equal` exists in `engine/expr.ts`. Confirmed by running. Compare values where both sides parse as numbers. Which equivalences count needs a decision: `3.1` for money surely, `2/4` for a question about simplifying perhaps not.

5. Two sittings of one lesson on one day share every attempt. `school/family/sheets.ts:65-95` takes a sitting's attempts to be every attempt on that lesson that day, so a screen sitting and a paper sitting recorded the same day both read the same `asked` and `right`, a paper sitting never waits to be marked, and `cameBackRight` can star it off the screen answers. `Attempt` carries no sitting id, while `fold` has `sitting` for screen answers and `worked` for marks. Confirmed by running. Carry the sitting id on the attempt and join by it.

6. Marking a paper writing or painting sheet records the piece as right. A printed sheet's questions are `askedIn` filtered to those not `worked`, which keeps by-eye pieces and questions answered elsewhere; `toMark` in `school/family/sheets.ts:282-326` keeps every question, and `marksOf` writes `marked { right: true }` for each one not tapped wrong from `apps/home/day.tsx:211-213`. `engine/answer.ts:225-229` and the docstring on `ToMark.answer` say a piece is never right or wrong, but the mark now feeds `progressOf` and the star. Confirmed by reading. `toMark` has the lesson, so it can find the block's item and leave out any question whose `pieceOf` is not null.

7. A by-eye lesson folds to nought right. `school/record/record.ts:349-358` gives a finished lesson with no auto-marked attempt `right: 0`, since `answered` events with `right: null` are skipped at `:211` and nothing folds `responded`. `mastery` at `:319` reads nought as revisit and `school/year.ts:242` counts it there, against the comment at `:330-332` that such a lesson is done without a share. No root page shows mastery yet, so this is latent. Confirmed by running. `Result.right` needs a way to say there is no share, and mastery should read it.

8. The reward's moment contradicts its own rule. `school/worlds/rewards.ts:156-165` walks the plan's days to the first on which the counted lessons are all done, then sets the moment to the last of those lessons' days instead. With three maths lessons finished on 1 to 3 September, a reading lesson never finished and reading turned off on the 10th, the moment lands on the 3rd, a week before the change that made it, and the road's open date and the lantern date follow. `.docs/story.md:121` and the docstring at `:102` state different rules. Confirmed by running. Decide which rule holds and make the function and both texts agree.

9. Parking days across a weekend collapses them. `park` in `school/family/family.ts:184-208` never sees the days it has already placed, so three days parked from a Friday by one week land on the 14th, the 17th and the 17th again. Only `family.test.ts:134` calls it, and that test parks two days that land mid-week. The product writes a `park` op that `trackDays` reads. Confirmed by running. Delete `park` with the other dead exports below, or thread the placed days through.

10. A shift of a negative number of weeks doubles the plan. `engine/answer.ts:538` accepts any integer for `weeks`, and `trackDays` at `school/family/family.ts:481-486` then plans the same dates twice in one track. The pages only offer one, two or four weeks, so it takes a crafted request. Confirmed by running. Refuse a shift of less than one week at the edge.

11. An attempt after today counts in the share. `progressOf` at `school/record/record.ts:344-351` filters sittings by `on <= today` but not attempts, so an attempt dated tomorrow by a fast device clock counts. Confirmed by running. Minor, and closed by item 14.

### The edge of the log

12. A child's view can end a paper sitting. `mayWrite` in `school/family/access.ts:63-68` checks the screen mode on `sitting-began` only, and `server/sync.ts:416` relies on it, so a crafted `sitting-ended` from a device holding the kids cookie can finish a paper sitting a grown-up recorded, and the view reads the sitting ids back. Confirmed by reading. Refuse a `sitting-ended` from a child's view whose sitting was not begun on a child's key, or carry the mode on the end as well.

13. The edge check bounds nothing but shape. `check` in `engine/answer.ts:785-799` accepted a `day-added` with a 900 kB note, minutes of `-5.5`, an empty subject, and `at` of `9999-12-31` and `1970-01-01`. The 1 MB body limit in `server/http.ts` is the only bound, an event is never updated, and a child's whole log is read on every record request, so a few hundred such events make a child unreadable. Confirmed by running. Add a per-event byte cap, a bound on `at` against the server's clock, and lengths on free text.

14. Unknown keys inside `data` are kept. Only `pin-set` and `exported` are strict, so a draft with extra keys passes the check and `server/sync.ts` stores `d.data` as checked. `readable` at `server/sync.ts:449-450` decides whether a family's content row is visible to a child or tutor by searching the kid's whole log with `JSON.stringify(e.data).includes(hash)`, so a smuggled key can satisfy it. Also accepted and probably not meant: negative `tries` and `hints`, negative screen timings, `q.n` of `-7` where the pack requires nought or more, an empty stroke, pressure outside nought to one, and a reversed tutor window in `member-added` and `member-changed` at `:746-756` while `days-off` and `terms` refuse one. Confirmed by running. A key whitelist per kind, and the same reversed-window rule everywhere.

### The guards

15. The database guard is blind to later weakening. `security` in `tools/scripts/check-db.ts:135-149` parses only `CREATE TABLE`, `ENABLE` and `FORCE ROW LEVEL SECURITY` and `CREATE POLICY`, and the rule at `:217-231` only asserts their presence with a substring match. A planted later migration with `DISABLE ROW LEVEL SECURITY`, `NO FORCE`, `DROP POLICY`, `ALTER POLICY ... USING (true)`, a wide `CREATE POLICY` on `keys` or `users`, `GRANT UPDATE, DELETE ON events`, `ALTER ROLE lumischool_app BYPASSRLS` or a predicate of `true OR family_id = ...` produced nothing. `keys` is in `POLICY_EXCEPTIONS` although its policy does compare `family_id`. `scope.itest.ts:39-43` has the same substring weakness and does not read `relrowsecurity` or `relforcerowsecurity`. The live tests catch most of these when a database is there, but db.md promises the guard holds without one. Confirmed by running. Teach `security` the weakening statements and an exact predicate, drop the `keys` exception, and have the live test assert the two flags.

16. The suppression guard misses three hatches TypeScript honours. A block comment whose last line is `@ts-ignore` above a wrong assignment, a definite assignment `x!: number`, and `("a" as never) as number` all compiled clean under the repo's strict options and none was reported by `tools/scripts/check-suppressions.ts`: the directive regexes at `:32-37` anchor to the comment's start while TypeScript reads its last line, no `TSNonNullExpression` exists for `!:`, and `toUnknown` at `:80-86` looks only for `unknown`. Confirmed by running. Read the last line of a block comment, walk definite-assignment nodes, and treat `never` and `{}` as `unknown`.

17. The seam's ratchet has slack. `SEAM_MOST` in `tools/scripts/check-suppressions.ts:44-52` holds 29 non-null and 1 any, the run prints that the files hold 26 and 0, and `:255-257` only warns, so three new `!` and one `any` can land in the scratchpad files the apps bundle before it fails, against CLAUDE.md's number that may only fall. Confirmed by running. Fail when a count could be lowered, or lower the numbers.

18. Index barrels and triple-slash references are unguarded. A planted `engine/ink/index.ts` with `import { unit } from "../ink"` passed `check-boundaries`, `tsc` and Vite, and only Node's resolver refused it, since `tools/scripts/resolve.ts:15-16` rewrites the directory to `./dir.ts`; written as `./dir/index` it passes all three. A `/// <reference path="../../.scratchpad/src/core/pen.ts" />` in a `.d.ts` reached the scratchpad past the seam with no report, because comments are not visited in `importsOf` at `:166-201`. Confirmed by running. Refuse any `index.ts` and any reference directive in the boundary check.

19. The e2e cleanup of today's work uses UTC midnight. `tools/e2e/ready.ts:31` clears work at or after `date_trunc('day', now())` in UTC, while the app decides today with `dayIn` in the family's zone, and the demo family is in Denver. A run at 19:00 Denver is past UTC midnight, leaves the 15:00 run's answers in place, and meets them on the same Denver day, which is the failure the comment at `tools/e2e/family.e2e.ts:46-50` describes. Confirmed by reading. Truncate in the family's zone.

### The engine

All of these are reached through authored content or a pack file rather than a child's typing, and `engine/ui/program.tsx:280` runs a program with no try, so an author can take the page down.

20. The plank board overcounts. `count` at `engine/arrange.ts:139` is `(open + 1) ** bags`, which includes the all-on-grass arrangement the listing skips and ignores `most`. For steps 4, load 5 at -2, bags 1 to 5 and most 1, `count` is 59,049 while `arrangements` lists 19,080, under the verifier's 20,000, yet `prove` at `:571-576` refuses the item as too many to walk with `tried: 0`. The cut board's count matches its listing. Confirmed by running. Count what `arrangements` lists.

21. The expression checker accepts literals the evaluator never makes. `exprProblem` at `engine/expr.ts:522-524` passes a `num` node whose text is `abc`, `Infinity`, `1.2.3`, an empty string, `1e3` or `-5`: the first two throw a misleading error at evaluation, `1.2.3` evaluates to 1.2 because `parseDecimal` splits on the first dot, and the rest print text that does not re-parse. `valueProblem` at `:507-516` and `:568-569` passes an unreduced rational, after which `2/4 == 1/2` is false and `showValue` prints `2/4`, and a range step of nought or less, after which membership throws division by zero or listing throws the member limit. Confirmed by running. Hold `num` text to the tokenizer's grammar, require `gcd(n, d) === 1`, and require a positive step.

22. Five plain-object lookups reach `Object.prototype`. `DIR_WORD` at `engine/coding.ts:321` and `DELTA` at `:896` crash the interpreter on a block named `constructor` with a `TypeError` that `run` does not catch; `COLOUR_WORDS` at `:107` paints with a function; `OPS` at `:184` makes `set n to 2 constructor 3` give six. `BY_EYE` at `engine/pack.ts:200` treats such a check name as a by-eye piece and `SECTIONS` at `:182-184` labels a section with the function's source. `beatsOf` at `engine/sound/beat.ts:32` uses `in` and returns a function. `engine/expr.ts` and `engine/answer.ts` already use `Object.hasOwn` for this. Confirmed by running. Use `Object.hasOwn` in all five, and have `run` refuse a word that is not its own.

23. Two loops have no bound. The `row` step at `engine/coding.ts:955-962` paints for the whole literal count rather than the world's width, so a literal of three hundred digits never returns, and `outcome` at `:1198-1200` allocates an array of the count, which throws or takes gigabytes. Confirmed by running. Stop the row at the world's width and cap the count.

24. A window of nought hangs. `momentIn` at `engine/motion/animation.ts:273` never returns for `every` of nought, and `timing` at `:241-251` gives `NaN` poses for a period of nought. Declarations on the shelf are held to `LIMITS.gap` by the test, so no shipped drawing carries it, but the exported functions take the values unguarded. Confirmed by running. Guard both.

25. A deep parse overflows the stack. `parseExpr` on twenty thousand leading minus signs throws `RangeError`, not the language's own error, and the notation calls it directly. Confirmed by running. A depth cap in the parser turns it into a readable message.

### The client

26. A blocked localStorage empties a signed-in log. `events` in `engine/ui/api.ts:386-391` returns null before asking when the sign-in hint is missing, and the hint is missing whenever `storage` at `:127-133` cannot reach localStorage, which `remember` swallows. `me({ ask: true })` still succeeds, so the family page loads, but `apps/home/log.ts:59-72` turns the null into `offline`, the calendar and the plan say lumischool could not be reached, the journal draws no past sheet, and the bar never appears. Triggers are a browser with site data blocked, a sandboxed frame and older private windows. Confirmed by running. Give the readers the same `ask` that `me` takes, or pass the failure through.

27. A late settle can change the screen twice. `CanvasView` in `engine/ui/view.ts` has no dispose: `settleSoon` at `:276-278` fires 160 ms after the last set and the tickers run on. `engine/ui/overworld.tsx:815-820` clears its view in cleanup, but `engine/ui/world.tsx:632-638` and `engine/ui/place.tsx:951-955` only call `stop`, and their `onSettle` can call `out` or `dive` again with `busy` false, so `apps/kids/inside.tsx` can be told twice about 0.7 s apart and flip a child who tapped into a day back to the place. Confirmed by reading. Clear the view in cleanup as the overworld does.

28. The child's build check misses a concatenated route. The search at `tools/scripts/check-kids-build.ts:59-64` needs the slash after `api`, so `"/api" + "/family"` and `"/api/kid" + "-sessions"` pass it. The boundary check keeps the grown-ups' client out of the child's build by import, so this is defence in depth only. Confirmed by running. Match `\/api\b` and add the case to the selftest.

## Improvement ideas

These are grounded in something specific but are choices rather than defects.

- The queue has no bound and keeps rows it can no longer read. `record` puts without a cap on count or bytes, and `all` at `engine/ui/kid.ts:121-125` filters rows that fail `readQueued` and never deletes them, so a row queued under an older shape stays in IndexedDB uncounted for good. Cap it and delete or surface the unreadable rows. `record` and the visibility handler also call `send` regardless of the backoff, so a 5xx outage costs one immediate request per answer.
- `ended` clears the queue on any `no-kid-session`. The server stamps `device` from whichever key the view holds and requires only that `kid_id` match the path, so the rows could be kept and sent by a view re-opened for the same child. A decision rather than a change.
- Every adult request opens two or three transactions: `verify` moves `seen_at` in one, `adultFrom` reads the family and the membership in a second, and the route opens its own. Fine at this size, and one transaction when latency is measured.
- Content visibility by substring scan. `readable` at `server/sync.ts:440-454` stringifies a kid's whole log per content read, and `contentFor` loops that per reachable kid for a tutor. A set of the hashes each kid's log names, or a check by known fields, is cheaper and closes item 14's path.
- The sweep of dead codes, expired sessions and ended view keys is not built, as api.md's list says. Keys accumulate until it is.
- Dead exports, which CLAUDE.md deletes: `weeks`, `behind`, `shiftFrom`, `park`, `outOfOrder`, `nextDay` and the `Plan` and `WeekRow` types in `school/family/family.ts` have no caller outside its test; `MASTERY_LABEL` in `school/record/record.ts:322` and `waitingToMark` in `school/family/sheets.ts:109` have none. `behind` also sits beside parent-app.md's rule that the app never says a child is behind.
- A rule whose line names the answer never groups. `school/lessons.ts:524` records `rule` as the line with the answer filled in, and `lookOf` and `sheetsBack` group mistakes by that string, so different wrong answers to the one rule count separately. One corpus item does this today. Store the unfilled line beside the filled one.
- A `marked` event whose sheet has no paper sitting recorded after it is dated to the marking day at `school/record/record.ts:271`, joins no sheet in `sheetsBack`, and the lesson never counts as done. `apps/home/mark.tsx:281` writes only `marked` drafts; whether another page always records the paper sitting first was not verified.
- `check:build` in `tools/scripts/check-build.ts:17-22` is a second full Vite build in `npm run check`, and `check-kids-build.ts:73-84` already builds with the same config and fails on a build error. Dropping it saves a build per run.
- `API_PORT` is honoured by the API and by nothing else: `tools/scripts/dev.ts:8` probes 8501 and `vite.config.ts:14,56` pin the proxy and the dev port, so the second-checkout override that local.md and `.env.example` describe starts an API the apps cannot reach.
- `server/db/migrations/migrate.ts` is excluded from lint and format by the folder patterns in `.oxlintrc.json:9` and `.prettierignore:6`, which were meant for the SQL and the meta JSON. With the pattern removed the lint reports `no-console` at `:37`.
- `tsconfig.json:7` gives `apps/`, `engine/` and `school/` the Node types, so `process.env`, `Buffer` and `import.meta.dirname` typecheck in browser code. Nothing uses them today, and only the package check in the boundary guard stands between a browser file and a Node global.
- `keys.user_id` has no index and `server/db/keys.ts:348,398` filter by it; `members.user_id` is covered only by the two partial unique indexes, which the cascade from a deleted login cannot use. Cost is nil at this size.
- Two on-screen colours in `apps/home/home.css:537-539` and `:674` are not palette tokens, and `#fff` is written directly in seven stylesheets where `--card` exists. `engine/ui/world.css:757-760` animates a class the reduced-motion block at `:806-813` omits; only a scratchpad page sets it today.
- `judge` in `engine/arrange.ts:624-642` does not call `board.legal`, so an uncut cake judges as one piece. Fine while every caller checks `legal` first, but the contract is not written down.
- `dayInWords` at `school/worlds/trail.ts:475-488` returns Today for a date after today, unreachable now. `school/worlds/roll.ts:90-91` reimplements `addDays`, which `school/record/record.ts` exports within reach.
- Tests worth adding, tied to the items above: the checkers refusing bad literal text, unreduced rationals and non-positive steps; `plankBoard.count` equal to its listing over a grid of inputs; a fuzz that `run` never throws anything but its own errors for words such as `constructor` and `__proto__`; `fold` with `at` order and `seq` order differing across devices, and a `sitting-ended` before its `sitting-began`; `marksIn` with a plan change after work; `park` landing on a weekend; and `grown-ups.e2e.ts:688`, which skips the morning's-order case on days the demo lays one lesson, so a regression there passes unnoticed.
- Document drift found on the way. api.md still says opening a children's view deletes the session and records `signed-out`, while `server/auth.ts` puts it away and records `session-changed`; its `Person` lacks `settings`, its `ChildRecord.tracks` lacks `own` and it has no `worlds`, while the client checkers match `server/api.ts`. structure.md's reach table still lists `record/read` and `record/household`, its root-files list names `pnpm-lock.yaml`, `eslint.config.js`, vitest configs and `AGENTS.md`, none present, and its guards table names four checks not in `package.json`; its tests table names `e2e/**/*.spec.ts` where the files are `tools/e2e/*.e2e.ts`. data-model.md gives the fold order as device then seq, while `record.ts:166-168`, api.md and db.md order by `at` first. CLAUDE.md's shape omits `engine/arrange`, `engine/coding`, `engine/pigment` and `school/tracks`. local.md says the scratchpad is moving to 8508 while its Vite config has no port and `server/http.ts` accepts 5173.

## Checked and found sound

Recorded so the next reader knows what was covered and need not read it again for these questions.

- Isolation. Every table forces row-level security, the policies are generated from `server/db/scope.ts` and the migration carries them verbatim, `app_family` reads through `nullif`, the app role is created without bypass and the migration's last statement refuses to finish if it could bypass or owned a table, `events` is insert and select only for it, and `content` has no update. A credential is checked inside the family it names, and nothing about another family is reachable while it is.
- Sign-in and keys. Secrets leave the server once and only hashes are kept; the code, PIN and address limits are counted on the rows themselves under row locks or an advisory lock; a session cookie is `HttpOnly`, `SameSite=Lax` and `__Host-` over HTTPS; every state-changing request needs a matching `Origin`, a same-site fetch and a JSON content type; a put-away session is refused by every adult route and given back only by the PIN on its own browser; the fresh-sign-in rule excludes a PIN-made session.
- The log. The family lock makes each writer's sequence gapless, a replayed draft writes nothing twice and comes back as stored, the fold orders by `at` then device then seq and the last answer per question wins, and no path in `school/` or `server/` reaches a model or any outside host. `school/assistant/` does not exist yet.
- The client. Every response body and stored value goes through a reader before use, the checkers match the server's shapes, no token or PIN is in storage or a URL, the queue's id is set once and survives a reload and two tabs, `put-away` sends the grown-ups' app to `/kids` and `signed-out` clears the hint, `nextFrom` refuses other origins and unsafe paths, effects with listeners and timers register `onCleanup`, and every tap target checked is at least 44 px.
- Product rules. No em-dash in `apps/` or `engine/ui/`, no dark mode or `data-theme`, every animation but the one dead class has a reduced-motion rule, and ports match local.md.
- The guards and config. The boundary check refuses every import form the reviewer could think of, including `export * from`, dynamic imports, `import.meta.glob`, `new URL`, root-relative and `/@fs/` paths, and app-to-app, and since 22 September 2026 the loader has no fallback into the scratchpad and the boundary guard refuses a scratchpad import by alias or by path; `resolve.ts` picks `.ts` over `.tsx` as TypeScript does; the latest snapshot matches `schema.ts` column for column; the seeds are safe to run twice and write through the app role; `.gitignore` keeps `.env` out; the e2e suite runs one worker with unique addresses per run.
- The engine. `numbers.ts` normalisation, sign, BigInt fallbacks and place growth; the tokenizer, precedence and the print-parse fixed point; the scene and pack readers; the pen's seeded randomness; the motion loop's step cap and reduced-motion collapse; pitch, scale and fretted place maths; and no `.skip`, `.only` or tautological test in any suite.

## Order of work

Ranked by what a family would meet first. Each line is one change, and a box is ticked when `npm run check` is green with it in.

- [x] Raise or trim the child's map budget so the check is green (state of the tree) (cleared 22 September 2026 by the moves rather than by raising it).
- [ ] Make the queue drop only what a refusal names, and wait on every other 4xx (items 1 and 2).
- [ ] Have the lesson read `record`'s result and fall back to memory on a storage failure (item 3).
- [ ] Compare typed numbers as values, after deciding which equivalences count (item 4).
- [ ] Bound the log's edge: per-event bytes, `at` against the clock, text lengths, a key whitelist per kind, the reversed-window rule (items 13 and 14).
- [ ] Refuse a child's `sitting-ended` on a paper sitting (item 12).
- [ ] Join a sitting's attempts by sitting id (item 5).
- [ ] Leave by-eye pieces out of `toMark` (item 6).
- [ ] Give `Result.right` a way to say there is no share (item 7).
- [ ] Settle the reward's moment rule and make the code and both texts agree (item 8).
- [ ] Give the readers `ask`, or pass the failure through (item 26).
- [ ] Teach the database guard the weakening statements and drop the `keys` exception (item 15).
- [ ] Close the three suppression hatches and make the ratchet fail (items 16 and 17).
- [ ] Refuse index files and reference directives in the boundary check (item 18).
- [ ] `Object.hasOwn` in the five lookups and a refusal in `run` (item 22).
- [ ] Hold the expression checker to the evaluator's own shapes (item 21).
- [ ] Count what the plank board lists (item 20).
- [ ] Bound the row step, the outcome count, the animation window and the parse depth (items 23 to 25).
- [ ] Clear the view in cleanup in the world and place screens (item 27).
- [ ] Truncate the e2e cleanup in the family's zone (item 19).
- [ ] Delete the dead exports, `park` among them (item 9 and the list above).
- [ ] Refuse a shift under one week at the edge (item 10).
- [ ] Match `\/api\b` in the child's build check (item 28).
- [ ] The improvements, each on its own: the queue's bound, `check:build`, the port override, `migrate.ts` under lint, the browser tsconfig, the two indexes, the colours, the tests listed, the document drift.
- [ ] A first commit, so the history the documents lean on exists.
