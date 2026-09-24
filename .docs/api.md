# The API

## Kids’ sign-in

| Route | Caller | Request / result |
| --- | --- | --- |
| `GET /api/kid-logins` | Parent | `{pinSet, kids: [{id, name, username}]}` |
| `POST /api/kid-logins/pin` | Fresh parent | `{pin}` with four digits; 204; must differ from the adult family PIN |
| `POST /api/kid-logins` | Fresh parent | `{kid, username}`; blank username generates one; unchanged normalized usernames preserve sessions; 204 |
| `POST /api/kid/sign-in` | Public | `{username, pin}`; `{credential}`; generic `wrong-pin` on failed or limited sign-in |
| `GET /api/kid/tab` | Child view | `{credential}` to adopt a legacy cookie view into the tab |
| `POST /api/kid/sign-out` | Child view | 204; ends only the supplied view |

Child routes accept `X-Kid-Session`, which takes precedence over the legacy cookie with no fallback
when invalid. Header-authenticated requests never refresh or clear a child cookie. Clients store this
credential in sessionStorage, partition their unsent-answer queue by key id, and never put it in a URL.
`POST /api/kid-sessions` with `{kids, tab:true}` returns `{credential}` instead of a cookie. A
header-authenticated `/api/kid/add` also returns the updated `{credential}`. Username-opened sessions
cannot add children or leave through the adult PIN; their view returns `others: []` and `pin: false`.
The list from `GET /api/kid-sessions` includes `login: true` for username sign-ins and `false` for parent-opened views.
`POST /api/auth/unlock` returns `retryAfter` with 429 or `attemptsLeft` on a wrong PIN.
Email start returns 503 `delivery-failed` on transport failure; bounded immediate retry is allowed.
See [auth.md](auth.md#kids-sign-in-and-independent-tabs) for revocation and rate limits.

Status: the first slice, built in September 2026 against [auth.md](auth.md), which remains the specification for every flow. This page is the contract the pages are written against: every route, who may call it, what it returns and how it fails. Where the slice builds less than auth.md describes, the section "Built and not built" at the end says which parts wait.

## Transport

The server is `server/http.ts` on port 8501, started with `npm run dev:api` (see [local.md](local.md)). It uses Node's own `http` module and web-standard `Request` and `Response`: the whole app is one function from a `Request` to a `Response`, which the tests call in process with no network, and a short adapter puts it on a socket. We did not add a router. The route table is ours whichever library carries it, because auth.md wants every route declared once with the caller it accepts, and a table of about thirty routes with a few path parameters needs a loop and a regular expression rather than a dependency. Hono, which auth.md named, would give the same in-process tests through `app.request`; moving to it later is mechanical, since every handler is already a function of a `Request`.

In development every app is served by the root's Vite dev server on 8500 from one origin, `http://localhost:8500` ([local.md](local.md), "The apps"): the children's view under `/kids` and the grown-ups' app on every other path. It passes `/api/` to `http://127.0.0.1:8501` without changing the `Origin` header. The route table separates parent and child access. Current child clients send `X-Kid-Session` from their own tab's session storage; a present but invalid header never falls back to the shared parent cookie. Parents use the browser-bound session cookie across tabs. Opening a tab-based child view preserves that parent session. The server still accepts the older child cookie and supports adopting it into a tab, as described above. No route reads an `Authorization` header. The scratchpad's pages still call the API through their own dev server on `http://localhost:5173`.

Every request that is not `GET` or `HEAD` must carry an `Origin` equal to one of the allowed origins (`APP_ORIGIN`, the one origin, `http://localhost:8500` in local development, and locally the scratchpad's `http://localhost:5173` as well), and a `Sec-Fetch-Site` of `same-origin` or `same-site` when the browser sends one (`same-site` is for a local page calling 8501 directly). Every `POST` sends a JSON body with `Content-Type: application/json`, and `{}` when there is nothing to say; a `POST` without that type is refused with `415`, an empty one included. CORS headers are sent only in local development and only to those origins, for a page that calls 8501 directly rather than through the proxy. The API reads only its own named cookies, so another app's cookie on the same host, well formed or not, changes nothing.

`GET /api/health` answers `200 { ok: true }` when the database answers a trivial query within a second, and `503 server` otherwise, so it stays quick when the database does not.

## Shapes

Responses are rows and envelopes. A row is the type inferred from its table in `server/db/schema.ts` (`Family`, `User`, `Member`, `Kid`, `Key`, `Content`), snake_case, and an event is an `Envelope` from `engine/answer.ts`, which is exactly an `events` row. A narrower shape is a `Pick` of a row. The objects that wrap rows (`{ me }`, `{ events }`, `{ ids }`) are not rows, so their own property names are camelCase, as CLAUDE.md asks. Timestamps are the one format, `2026-09-14T09:12:00.000Z`, and days are `2026-09-14`.

The shapes below are declared once, in `server/api.ts`, which holds types only and imports only types, so a page can `import type` from it without its type checker reaching the server; `check:db` lets an app import it that way and nothing else from `server/`. `Draft` is in `engine/answer.ts` beside `Envelope`, since the store takes it too.

```ts
type Person = Pick<User, "id" | "email" | "name">;
type FamilyChoice = { family_id: string; name: string; kid_id: string | null };

interface Me {
    user: Person;
    family: Family;
    /** The caller's own active rows in this family: one for a parent, one per kid for a tutor. */
    members: Member[];
    /** Every family the person may choose between, from `my_families`, for the switcher. */
    families: FamilyChoice[];
    /** `id` is the stamp on everything this browser writes. */
    session: Pick<Key, "id" | "kind" | "created_at">;
}

/** What a browser sends to append: the server fills `family_id`, `actor`, `device` and `seq`. Distributive, so each kind keeps its own data. */
type Draft = Envelope extends infer E ? (E extends Envelope ? Pick<E, "id" | "kid_id" | "kind" | "data" | "at"> : never) : never;

/** The children a children's view was opened for, the family's other children a grown-up may add to it, and whether the family has a PIN to leave it with. */
interface KidView {
    family: Pick<Family, "name" | "time_zone">;
    kids: Kid[];
    others: Pick<Kid, "id" | "name">[];
    pin: boolean;
}

/** One child's log as their view reads it back. */
interface KidState {
    kid: Kid;
    events: Envelope[];
    /** The tutors whose window is open today. */
    tutors: { name: string | null; to_day: string }[];
}

/** One child's record as the server folds it from their log (school/family/family.ts), and the pack it was folded against. */
interface KidRecord extends ChildRecord {
    kid: Kid;
    pack: string;
}

interface ChildRecord {
    today: string;
    /** The first day of the kid's school year, or null before a track was turned on. */
    start: string | null;
    /** The plan's track ops in the order written, each with its day. */
    tracks: { track: string; on: boolean; perWeek: number; day: string }[];
    /** Each grade's progress, lowest first: every grade up to the kid's, and any with a finished lesson. */
    years: { grade: number; progress: Progress }[];
    /** The planned days of each track that is on, three weeks past today. */
    plan: { track: string; days: PlannedDay[] }[];
    /** Screen sittings begun and not ended, with the numbers of the questions answered in each. */
    unfinished: { sitting: string; lesson: string; lessonHash: string; began: string; answered: number[] }[];
}

/** One child as a parent's page reads them: the record the child's view reads, and beside it what came back (school/family/sheets.ts). */
interface GrownRecord extends ChildRecord {
    kid: Kid;
    pack: string;
    /** The Monday of last week. */
    from: string;
    /** Every sheet from `from` to today, and every paper sheet still waiting to be marked, oldest first; a waiting sheet carries its printed sheet's id and questions. */
    back: SheetBack[];
    /** The mistake line its author wrote that came up most often in the last four weeks, if one came up more than once. */
    look: { rule: string; lesson: string; times: number; days: number } | null;
}

/** The pack a view or a grown-up's page reads lessons from: its digest, and the index of every lesson (engine/pack.ts). */
interface PackView {
    pack: string;
    index: PackIndex;
}

/** A children's view open on one browser, as the family's page lists it. */
interface KidSessionView {
    view: string;
    /** The browser, as its user agent named it: "Safari on an iPad". */
    name: string | null;
    /** The parent who opened it. */
    user_id: string;
    kids: string[];
    created_at: string;
    seen_at: string | null;
}
```

## Errors

Every error is JSON, `{ error: "<code>" }` with the fields below where they apply, and the code is stable enough to switch on.

| Status | `error` | Extra fields | When |
|---|---|---|---|
| 400 | `bad-request` | `problem` | The body is not the shape the route reads |
| 400 | `bad-email` | | The address is not an address |
| 400 | `no-pending` | | A code or a choice arrived without the pending cookie |
| 400 | `wrong-code` | `attemptsLeft` | A wrong code; after five the code is dead |
| 400 | `wrong-pin` | `attemptsLeft` | A wrong family PIN; `attemptsLeft` is how many more wrong tries the PIN takes before it stops working |
| 400 | `bad-envelope` | `at`, `problem` | An event failed the edge check in `engine/answer.ts`; `at` is its index in the batch, and nothing in the batch was written |
| 401 | `signed-out` | | No session, or one that has ended |
| 401 | `no-kid-session` | | No children's view cookie, or one whose keys have ended; the cookie is cleared |
| 403 | `origin` | | The `Origin` or `Sec-Fetch-Site` check failed |
| 403 | `not-allowed` | `problem`, and `at` for an append | The caller can see this but may not do it |
| 403 | `fresh-sign-in` | | The action needs a sign-in in the last ten minutes |
| 404 | `not-found` | | Nothing there, or nothing the caller may see |
| 409 | `no-consent` | `kid` | A children's view was asked for a kid without an active consent |
| 409 | `no-pin` | | The family has no PIN, or it stopped working after fifteen wrong tries; a parent signs in and sets one |
| 409 | `notice-changed` | `notice` | A parent consented to a notice that is no longer the current one |
| 410 | `expired` | | The code ran out; ask for another |
| 410 | `dead-code` | | Five wrong guesses; ask for another |
| 413 | `too-large` | `limit` | A batch over the route's count (50 events from a children's view, 500 from a session) or over 1 MB |
| 415 | `not-json` | | A body that is not `application/json` |
| 429 | `rate-limited` | `retryAfter` (seconds) | A limit from auth.md's table refused, including the wait after wrong PIN tries |
| 500 | `server` | | Our fault. The answer carries an `x-request-id` header, and the server logs one line under that id: the route and the error code, and the detail only in local development, since a failed query's message holds its parameters |

## Signing in

A browser that is asking for a code holds `ls_pending`, a cookie that lasts fifteen minutes. A signed-in browser holds `ls_session`, whose value is the session key's credential, `<family>.<key>.<secret>`. Both are `HttpOnly`, `SameSite=Lax` and `Path=/`; in production they become `__Host-ls_pending` and `__Host-ls_session` with `Secure`, and the API reads no cookie without the prefix there. Script never reads either. The session cookie's `Max-Age` is thirty days, never past ninety days from the sign-in, and the cookie is sent again with a fresh one when a request moves the session's `seen_at`, which happens at most once a day; a shared session's cookie has none.

| Route | Body | Answers |
|---|---|---|
| `POST /api/auth/email/start` | `{ email, shared?, start? }` | `202 {}` and the pending cookie, the same whether or not the address has a login. The code is printed in the server's terminal (the console transport). `shared: true` makes the session a `shared-session`, for a shared device such as the one a children's view is open on. `start: { name, family, timeZone }` is flow 1's start page: the code then starts that family, for a new address or one that has a login already. Errors: `bad-email`, `bad-request` (a `start` without a real time zone), `rate-limited` |
| `POST /api/auth/email/verify` | `{ code }` | With `start` on the code, `200 { me }` in the new family. Otherwise `200 { me }` with the session cookie when the login is in one family; `200 { choose: FamilyChoice[] }` when it is in several, and the code is kept, proven, for its ten minutes; `200 { start: true }` when the address has no login or no active family, and the page offers to start one. Spaces and a hyphen in the code are ignored. Errors: `no-pending`, `wrong-code`, `expired`, `dead-code` |
| `POST /api/auth/email/choose` | `{ family_id }` or `{ start: { name, family, timeZone } }` | `200 { me }` with the session cookie. The code is used in the transaction that makes the session, so a step that fails leaves it. The second form makes the login if there is none, the family, its first parent, and the session, in that one transaction, and records `member-added` and `signed-in`. Errors: `bad-request`, `no-pending`, `expired`, `not-found` for a family the login is not in |
| `POST /api/auth/switch` | `{ family_id }` | `200 { me }`. A new session in the other family that keeps the old one's `created_at`, the old key deleted in the same transaction, the cookie replaced |
| `POST /api/auth/sign-out` | `{ everywhere? }` | `204`, the cookie cleared, and `signed-out` recorded either way. `everywhere: true` ends every session the person has in this family, this one included |
| `GET /api/me` | | `200 Me`, or `401 signed-out` |

Every sign-in records `signed-in` in the family, with the method and whether the device is shared. A sign-in by code in a browser that already holds a session of the same person deletes that session in the transaction that makes the new one, whichever family it was in. A sign-in in a browser that holds a children's view cookie ends that view: its keys are deleted, `kid-session-ended` is recorded with the reason `sign-in`, and the cookie is cleared in the same answer. The cookie is read only to end the view, so signing in is also the way out of a children's view for a grown-up who has no PIN.

## A family

All of these need a session. A parent sees the whole family. A tutor sees the family's row, their own member rows and themselves, and only the kids their window reaches today in the family's time zone.

| Route | Answers |
|---|---|
| `GET /api/family` | `{ family: Family, kids: Kid[], members: Member[], users: Person[], pin: boolean }`. `members` includes ended memberships, so a removed tutor's name still resolves; join `users` by `user_id`. `pin` is whether the family has a PIN, never a hash, which the family's page reads here since 15 September 2026 rather than from the open views. A tutor gets only their reachable kids, their own rows and themselves |
| `POST /api/kids` | `{ name, grade, consent: { notice } }` answers `{ kid: Kid }`: flow 4, the kid and a `consent-given` against the family in one transaction. `notice` must be the current notice's version, `2026-09`. Parents only. Errors: `bad-request`, `not-allowed`, `notice-changed` |
| `GET /api/kid-sessions` | `{ views: KidSessionView[], pin: boolean }`, the children's views open in this family and whether it has a PIN, never a hash. Parents only. No app reads it since 15 September 2026, when the owner decided that which browsers hold a view is log data rather than something a parent manages; it stays for a later surface |
| `POST /api/kid-sessions` | `{ kids: string[] }` answers `204`: flow 5. In one transaction, one `kid-session` key per child, each with the parent as `user_id`, the browser's name, and one view id in `detail` that all of them share; this browser's session key deleted; and `kid-session-opened` and `signed-out` recorded. The answer clears the session cookie and sets `ls_kids`. It needs no fresh sign-in, since it leaves the browser with less than it held. The family's page sends one child, and the others join from inside the view (`POST /api/kid/add`). Parents only. Errors: `bad-request`, `not-allowed`, `not-found` for a kid not in the family, `no-consent` with `kid` |
| `POST /api/kid-sessions/end` | `{ view }` answers `204`: the view's keys deleted and `kid-session-ended` recorded with the reason `ended`. Answers that browser had not sent are lost. Parents only. Errors: `bad-request`, `not-allowed`, `not-found` |
| `POST /api/kid-sessions/end-all` | `{}` answers `200 { ended: number }`: every children's view open in the family ended as above, one `kid-session-ended` per view, which is what "End every open view" on the family's page calls. Parents only. Errors: `not-allowed` |
| `POST /api/family/pin` | `{ pin }` answers `204`: the family's PIN, four digits, replacing any before it with its count of wrong tries cleared, and `pin-set` recorded. Parents only, signed in within ten minutes, and never by a session a PIN made. Errors: `bad-request`, `not-allowed`, `fresh-sign-in` |
| `GET /api/kids/:kid/record` | `GrownRecord`, one child folded on the server for a parent's page (see "What the pages derive"). Parents only. Errors: `bad-request`, `not-allowed` for a tutor, `not-found` for a kid not in the family, `server` with `problem` while no pack is built |
| `GET /api/events?kid=<id>` | `{ events: Envelope[] }`, the kid's log in the order it happened (`at`, then `device`, then `seq`). With no `kid`, the whole family's log, including the events that belong to no kid (consent, sign-ins, a parent's own questions); parents only. A tutor must name a kid they reach today and gets only the kinds a tutor reads |
| `GET /api/events?kinds=&from=&to=` | The same, narrowed before the rows are read: `kinds` is a comma-separated list of event kinds, and `from` and `to` are days, inclusive, in the family's own time zone (the read is a day wider either side and the answer is narrowed by `dayIn`). A kind that is not an event kind, or days out of order, is `bad-request`. The calendar reads the plan this way (`kinds=plan-changed`, 7 kB of the demo family's log) rather than the whole log (6.8 MB) |
| `POST /api/events` | `{ events: Draft[] }` answers `200 { events: Envelope[] }`, the rows as stored. The server fills `family_id`, `actor` (the person), `device` (the session key's id) and `seq`, taking the next number for this session while it holds a lock on the family's row, so two tabs on one session never collide. `id` is the browser's, so a retried draft is written once and its stored row is returned. A parent may send `sitting-began` and `sitting-ended` (paper sittings, or a sitting with a grown-up), `sheet-printed`, `marked`, `plan-changed`, `world-chosen` and `day-added`; a tutor the first four, for their kid inside the window. Errors: `bad-envelope`, `not-allowed`, and the whole batch is refused on either |
| `GET /api/content` | `{ content: Content[] }`, the family's own rows. With `?name=<name>`, every revision with that name, the catalogue's and the family's |
| `GET /api/content/<hash>` | `{ content: Content }`, a catalogue row or one of the family's. `404` otherwise |
| `POST /api/content` | `{ body }` answers `{ content: Content, event: Envelope }`. The row and its `content-authored` event (with `model: null`) in one transaction, under this session's stamp. `name` and `kind` are read from the body's own declaration. Parents only |

The plan is not a table. It is the `plan-changed` events in a kid's log, folded over the tracks the kid is doing, on every read and never stored. See "What the pages derive" below.

Calendar also writes two child-scoped plan operations: `routine` (`track`, `from`, distinct
`weekdays`, `sessions` from 1 to 3), and `session` (`id`, `track`, nullable projected `source`,
nullable `onDay`, `lesson`, `kind`, `minutes`, `order`, `note`, `removed`). An empty routine's
weekday list pauses automatic sessions. A session's null date parks it; `removed` removes that
placement only. Each update repeats the placement snapshot under the same session id. These use
the existing event append transaction and parent authorization; no new table or endpoint is needed.


The worlds a child's terms are in are not a setting either. Each `world-chosen` event carries the family's whole choice for one kid, trimmed to what differs from each world's own (by grade, the world of each term in order, and per world what was tweaked), and the fold reads each term against the choice as it stood when that term's first sitting began, or the latest choice for a term with no work yet. So a choice written after a term has work in it, including one from a device that had not seen the work, leaves that term's world as it was, and no mark the child's work made there moves. A world's tweaks are read the same way, since a tweak can take away a landmark the work lit: a world standing in a term with work keeps the tweaks that stood at that term's first work, a world standing only in terms with none takes the latest, and a place a track brings a child to keeps the tweaks that stood at the child's first work of all. `chosenWorlds` in `school/family/chosen.ts` is the fold, the record carries it as `worlds`, and `savedChoice` beside it gives the pages the shape `readChoice` in `school/worlds/choice.ts` reads, filling each term the choice leaves alone with its own world. An undo does not reach a `world-chosen` event: a parent chooses again instead.

`PlanOp` in `engine/answer.ts` is the change itself, and the calendar added five to the four the first slice had (17 September 2026): `days-off {from, to, note}`, for one child or, with `kid_id` null, for the family; `school-days {weekdays}`, one child's, ISO weekdays with Monday 1, applying from the day it was written; `terms {terms[]}`, the family's dated terms, the latest winning; `move {track, from, to}`, one track's day to another day, swapping with what that track had there; and `undo {of}`, which names an earlier event the fold reads past, so taking a change back is a change of its own and an undo of an undo puts the change back in force. A family day is not an op: it is a family `days-off` of one day and a `day-added` for each child, which the records already read, and putting it back writes an undo for each of those events. `alive`, `movesOf` and `trackDays` in `school/family/family.ts` read them, and `school/family/calendar.ts` folds the family's year from the same events.

## A child's view

A browser a parent opened the children's view on holds `ls_kids` (`__Host-ls_kids` in production, with `Secure`), which is `HttpOnly`, `SameSite=Lax` and `Path=/`. Its value is the credentials of that view's `kid-session` keys, one per child, each `<family>.<key>.<secret>`, joined by `~` and all naming one family. Its `Max-Age` runs until the keys' own rule would end them, and the cookie is sent again with a fresh one when a request moves their `seen_at`, at most once a day, as the session cookie is. Every route below reads that cookie and no other. With no cookie, or one whose keys have all ended, the answer is `401 no-kid-session` and the cookie is cleared. `:kid` must be one of the view's children, and any other kid is `404 not-found`.

| Route | Body | Answers |
|---|---|---|
| `GET /api/kid` | | `200 KidView`: the children this view is for, the family's other children with an active consent (`others`), and whether the family has a PIN |
| `GET /api/kid/:kid/state` | | `200 KidState`. `events` are the kinds a children's view reads back for its own kid: sittings, answers, hints, rounds, sheets, marks, responses and plan changes, never a parent's day note, the family's authoring or anything about who signed in. With `?lesson=<id>`, only that lesson's events, which is how a view looks back at a finished lesson. `tutors` are the tutors whose window is open today |
| `GET /api/kid/:kid/record` | | `200 KidRecord`: the child's record folded on the way out, which is what a view opens on. Errors: `server` with `problem` while no pack is built |
| `GET /api/kid/:kid/pack` | | `200 PackView`, the pack the record was folded against |
| `GET /api/kid/:kid/pack/<digest>/lessons/<file>` | | A lesson's file from that pack, as its index names it, with `Cache-Control: private, max-age=31536000, immutable`, so the browser keeps it for a year and a lesson opened after a short drop still opens. `404` for any other pack or file |
| `GET /api/kid/:kid/pack/<digest>/scenes/<file>` | | A lesson's first drawing from that pack, `PackScene` in `engine/pack.ts`, as the index's `first` names it, cached the same way; for a page that shows a lesson as a sticker without opening its file. `404` for any other pack or file |
| `POST /api/kid/:kid/events` | `{ events: Draft[] }` | `200 { ids: string[] }`, the ids now stored, whether written now or already there. At most 50 events and 1 MB. The server fills `family_id`, `actor` (null), `device` (this child's key id) and `seq`, taking the next number for that key while it holds a lock on the family's row, so each child's key is one stream. `kid_id` must be `:kid`, and `id` is the browser's, so a chunk sent again is written once. The kinds a children's view writes are `sitting-began` and `sitting-ended` for screen sittings, `answered`, `hint-opened` and `round-played`. Errors: `bad-request`, `bad-envelope` and `not-allowed` with `at`, `too-large`, and the whole batch is refused on any of them |
| `GET /api/kid/:kid/content/<hash>` | | `{ content: Content }` for a catalogue row, or a family row this kid's own log names |
| `POST /api/kid/add` | `{ pin, kid }` | `204`, and the view's cookie again with a key for that child added: a grown-up adds another of the family's children to this view (flow 6). The PIN is checked as `leave` checks it, with the same waits and count; then a `kid-session` key for the child in the same view under the parent who opened it, and `kid-session-opened` recorded. A child already in the view is left as they are. Errors: `bad-request`, `wrong-pin` with `attemptsLeft`, `rate-limited` with `retryAfter`, `no-pin`, `not-allowed` when the opener is no longer a parent, `not-found`, `no-consent` with `kid` |
| `POST /api/kid/leave` | `{ pin }` | `204`. The view's keys are deleted and its cookie cleared, and the parent who opened the view gets a `shared-session` and its cookie; that session never counts as a fresh sign-in. `kid-session-ended` with the reason `pin` and `signed-in` with the method `pin` are recorded. Errors: `bad-request` (not four digits), `wrong-pin` with `attemptsLeft`, `rate-limited` with `retryAfter` while the PIN waits after wrong tries, `no-pin` |

The page in the children's view sends what a child does through a queue it keeps in the browser, in chunks well inside these limits ([auth.md](auth.md), flow 8), takes out of the queue the ids each answer names, and leaves the view only once nothing is waiting.

A grown-up's session reads the same pack at `GET /api/pack`, `GET /api/pack/<digest>/lessons/<file>` and `GET /api/pack/<digest>/scenes/<file>`. The index holds what every view reads of a lesson without opening its file (id, source, title, goal, grade, unit, subject, format, drawings, skills, each level's hash, the lesson's file and its first drawing's) and nothing of its sections or items, which are in the lesson's file, since every view reads the index whole and it is held to 60 KB gzipped (16 September 2026). The pack is never a public file: a digest in a path is not access control, and every lesson file is answered under a session, so the visitor's pack on the site is a second, filtered pack of its own. That pack is written at build by `tools/first-view.ts` under `assets/site-pack-<digest>/`, every lesson at its medium level with `visitorOf` in `tools/pack.ts` leaving out the answers, the hints, the feedback, the notes for grown-ups and the draws for another day, and the site's page reads it without a session (`apps/site/school.ts`).

## The local outbox

Only the console email transport is built, so no email is sent. It keeps the last twenty emails it printed, and one route returns them while the server runs locally; it answers `404 not-found` anywhere else and to a request not made on this computer.

| Route | Body | Answers |
|---|---|---|
| `GET /api/dev/outbox` | | `{ emails: Sent[] }`, newest first, where `Sent` is `{ to, subject, text, at }`. The grown-ups' app shows them at `/outbox` |

## What the pages derive

The server stores events and never stores a fold. A child's view reads a fold the server makes on the way out with the same code the pages would use (`childRecord` in `school/family/family.ts`, behind `GET /api/kid/:kid/record`), because a child's whole log is megabytes after a term, and the fold is a few kilobytes.

A grown-up's page reads each child the same way since September 2026. `GET /api/kids/:kid/record` answers the child's record as the child's view folds it, and beside it every sheet that came back since the Monday of last week or is still waiting to be marked, with the questions of the sheet as it was printed, and the mistake line its author wrote that came up most often in the last four weeks (`childWeek` in `school/family/sheets.ts`). The home would otherwise fold three logs of about 1.9 MB each in the browser; the answer for each of the demo children is 3 to 6 kB gzipped.

The calendar reads the filtered events rather than a fold, because it lays a year out for every child at once: the plan (7 kB of the demo family's log), the sittings and days added of the last 400 days (423 kB), and the sheets printed in the last three weeks (60 kB), where a year of printed sheets would be 680 kB on its own, since each carries the questions of its sheet. A fold on the way out, as `GET /api/kids/:kid/record` does for one child, would bring that to a few kilobytes, and is what to build if the first paint is too slow. The year view reads each child's record as well, for the worlds their terms are in, so the year and the child's own map fold the family's choice the same way.

Since 17 September 2026 the server gzips an answer of more than about a packet for a caller that takes it that way (`squeezed` in `server/http.ts`), which is an eightfold cut on these reads (that year of events 414 kB to 55 kB, a lesson's file 131 kB to 13 kB), so the fold of the year on the way out is what to build when a family holds more than a year of work or a real connection shows the first paint to be slow, rather than now.

- The first day of a kid's school year is the first school day on or after the kid's earliest `plan-changed` event whose `op` is `track` with `on: true`, and the day of their first sitting or today for a kid with no such event, which is what a kid whose family has changed nothing has.
- A kid's tracks are their grade's default from `DEFAULT_TRACKS` in `school/tracks.ts`, dated at the first day of their school year, with the `track` ops in their log over it, latest per track wins. No default is ever written into the log, so a family that has changed nothing follows the table as it changes, and a parent turning a subject off writes an ordinary `track` op with `on: false`. `perWeek` is how many days a week that track is worked, and `own` on each entry says whether the family set it or took the default. `ChildRecord.tracks` carries the whole list in that order, so a reader that walks it forwards sees the default first.
- A pace lays a track on fixed weekdays, which are then turned along the child's school week by that track's own offset in `TRACK_TURN`, so two tracks at the same pace do not land on the same day: before the turn, 5 is every day, 3 is Monday, Wednesday and Friday, 2 is Tuesday and Thursday, and 1 is Wednesday. Without it every track at one day a week would fall on the same Wednesday and a default of several would be one long day and four empty ones. Each day in a track works that track's current lesson, in the track's order (grade, then unit, then file order, as `tracks.ts` has it), and the lesson moves on when the family moves on, so days per lesson vary.
- `shift`, `park` and `set-day` ops move planned days as `trackDays` in `school/family/family.ts` does.
- A day's work is its sittings: `sitting-began` to `sitting-ended` with the same `sitting` id. A paper sitting is recorded by a parent's session with `mode: "paper"`, and its questions are the `sheet-printed` event with the same lesson printed before it; its marks are `marked` events naming that `sheet`, which arrive days later or not yet.
- Rewards, the week, the letter and the records are all worked out from those, with the lessons and items read from the pack: the index for a lesson's facts and `lessons/<id>-<hash>.json` for the lesson at each of its levels. `GET /api/content/<hash>` reads a body somebody saved, which is a parent's own question or the catalogue manifest a pack digest names; a `lessonHash` or an `itemHash` in the log names a level rather than a body, so it is not a thing to fetch ([db.md](db.md), "The log").

## Local only

The server reads its configuration once at start, and refuses to start outside `LUMISCHOOL_ENV=local` for now, printing why, because only the console email transport is built and it prints codes rather than sending them. Locally the code step also accepts the fixed code `12345678` ([auth.md](auth.md), flow 2), which the server refuses to start with anywhere else.

## Built and not built

Built: sign-in by emailed code (flow 2) with the console transport; starting a family (flow 1), with the start page's answers carried on the code, or offered after a code to a login with no family; choosing among several families and switching; signing out and signing out everywhere (flow 10); `/api/me`; adding a kid with consent (flow 4, without its confirming email); the family reads; appends under a session and under a children's view, with the binding auth.md sets out; opening, listing and ending children's views, and the family PIN with its limits (flows 5 to 7).

Built since: the one origin in development, with the grown-ups' app and the children's view calling these routes ([local.md](local.md)); the children's view's queue in the browser (flow 8); and the local outbox.

Not built yet, in auth.md's order of work: the sign-in link and passkeys; the fresh sign-in for anything but setting the family PIN; invitations and removing members (flow 3), which will also end the children's views a removed parent opened; withdrawing consent, which will also end that child's views, and the confirming email; changing a tutor's window; deleting a kid, closing a family and exporting (flow 12); the sweeps; `?since=` on a child's state; Resend; serving the built apps from the API's process in production, and their content security policies.


## Shared parent sign-in and independent child tabs

Parent cookies are shared across tabs; `X-Kid-Session` identifies only the child's view in that tab.
Adult routes reject that header even if a valid parent cookie is present. Both kinds of session
require their bound HttpOnly browser cookie. Old unbound sessions require a new sign-in.

- `GET /api/auth/status` returns only `{ available, locked }`, allowing the sign-in page to offer adult PIN unlock.
- `POST /api/auth/lock` locks this browser's current parent session, leaving child views active.
- `POST /api/auth/unlock` accepts `{ pin }`, verifies the adult PIN, and restores the held parent session.
- `POST /api/auth/browser/sign-out` requires parent authorization and revokes all sessions bound to this browser.
- `POST /api/auth/email/start` accepts `tab: true` and returns `{ challenge }` while also setting the pending cookie for legacy clients. Verify/choose accept it in `X-Sign-In-Challenge`.
- `POST /api/kid-sessions` with `tab: true` returns a credential without locking the parent session.
- `POST /api/kid/sign-in` preserves parent and sibling sessions. Switching a duplicated child tab does not revoke its original view.

The browser cookie carries no authority by itself. Its key is revocable and its secret's hash binds
the session, so browser-wide sign-out remains effective even if a tab retries with its old credential.


## Weekly email preferences

Parent-only GET /api/letters/preferences returns { mode: "off" | "private" | "detailed" } without loading the lesson pack or building a report. POST at the same path saves that choice and cancels queued delivery as before. "private" means a reminder linking to the family Home page with no child details. GET /api/letters and the /letters app screen have been removed.


## Family members

See [multi-parent.md](multi-parent.md) for the parent management and invitation endpoint contracts. Parent removal is family-scoped; joining issues a browser-bound parent session through the existing auth flow.

## Painting galleries

All painting endpoints currently require an active parent session. Children's sessions and tutors
cannot call them during parent QA. Parents can access every consented child's gallery in their family
and their own private parent gallery. `kid_id` omitted means the caller's own paintings.

- `GET /api/paintings?kid_id=…&before=…`: `{artworks, next}` with 24 metadata/PNG thumbnails per page.
  `next` is an opaque cursor or null. Editable document bodies are loaded separately.
- `GET /api/paintings/:id`: `{artwork, document}` for an accessible live painting.
- `POST /api/paintings/save`: `{scope:{kid_id},document,expected_revision,operation_id,thumbnail}`.
  Revision zero creates; UUID operation IDs make recent retries harmless. Returns
  `{artwork,document,conflict}`; a conflict returns a new artwork ID with both versions preserved.
- `POST /api/paintings/delete`: `{id,revision}`. Returns `{ok:true}`; stale revision returns 409.

Documents use the versioned `Picture` schema and bounded validation (720 KiB); PNG thumbnails are
at most 64 KiB. Every response is private. No public artwork URLs or sharing links are created.
