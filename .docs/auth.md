# Authentication and authorisation

## Kids’ sign-in and independent tabs

Parents can enable a child’s own sign-in on `/account`. Children still have no email address or
`users` row. `kids.settings.username` is a globally unique, case-insensitive sign-in name, separate
from the display name; new children get a name plus a random suffix. A parent can edit it or leave
it blank when saving to generate another. `kids.settings.kidLogin` defaults to false. Enabling
requires consent and a kids’ PIN. These changes require a parent’s email sign-in in the last ten
minutes; a session restored through the adult PIN is insufficient.

The shared **kids’ PIN** is a `kid-pin` key, HMAC-hashed with a separate domain and family id. It
must differ from the adult family PIN in either direction. `/kids/sign-in`, linked from the marketing
header, accepts a username and kids’ PIN. Its `kid-session` names only that child and has
`detail.login = true`. It cannot add siblings or restore an adult session, even with the adult PIN.
Successful sign-in clears the browser’s adult session so navigating to parent pages requires adult
sign-in again. Failed sign-in changes no browser credentials.

Current clients keep child credentials in **sessionStorage**, never localStorage or URLs, and send
`X-Kid-Session`. An explicit header wins over the legacy cookie, including an empty or invalid header;
it never falls back to a different child. Parent-opened views use the same transport. Existing cookie
views can be adopted once through `/api/kid/tab`. Adult credentials remain HttpOnly cookies. Child
tab sign-out and revocation never overwrite another tab’s child credential. A marketing link opens
a fresh tab with `noopener`; signing into two such tabs creates two independent views. Reloading a
tab keeps its view; duplicating a tab may copy its session until a separate sign-in replaces it.

Each view’s short unsent-answer queue has its own IndexedDB database, named with the non-secret
family/key ids. A sibling’s tab cannot send, discard or clear it. Before voluntary sign-out or a
replacement sign-in, the current tab sends its waiting answers; without a connection it stays open.
Revoked views discard only their own queue. Closing a tab does not revoke its server key; parents
can close that view from the existing open-views list. There is no local copy of the child’s log.

Changing a username or enabling/disabling sign-in revokes that child’s username-opened views. Setting
the kids’ PIN revokes all username-opened views in the family. Parent-opened views keep their existing
rules. Parents can also end individual views or all views, regardless of how they opened.

Public failures use the same response for unknown names, disabled access, wrong PINs and throttling.
`kid_login_lookup` atomically counts attempts before lookup: five per normalized username and twenty
per network in fifteen minutes. The stored identities are peppered hashes; attempt rows expire after
a day. Failed PIN attempts are also counted across siblings: five wrong tries impose a fifteen-minute
wait and fifteen require a parent PIN reset. A family advisory lock serializes successful sign-in
with configuration changes and revocation. Resetting the PIN does not bypass the public attempt limits.

This section supersedes the original browser-cookie-only and parent-opened-only descriptions below.

Status: proposed, September 2026, and rewritten against the data model the owner approved that month. This document says who can sign in to lumischool, how a child reaches their own pages without an account, how every request is tied to one family before anything is read, and what each caller may read and write, across every flow a family meets. It uses the seven tables of the final schema and adds none: every credential and every secret we send is a row in `keys`, and where an auth need might have wanted a table or a column of its own, the document says which of the seven holds it. The store agent owns the schema and its migration, and "The schema, as auth uses it" lists in one place what auth needs from each table and function. Every flow says what is written and what is checked, and the order of work near the end is a list of steps with what "done" means for each. Where a choice is still the owner's it is marked as a recommendation and repeated as a one-sentence question at the end.

It starts from the documents that already constrain it. [product.md](product.md) sets the privacy position, [data-model.md](data-model.md) holds a family's record as one log on the server, [db.md](db.md) and the final schema hold the family, its members, its kids, its keys and its log, [structure.md](structure.md) says where a server goes when there is one, and [local.md](local.md) settles the ports and hosts.

The first slice of the server is built, as [api.md](api.md) sets out route by route: sign-in by code, sessions, choosing and switching a family, adding a kid with consent, opening and ending a children's view, the family PIN, appends with the binding below. It follows this document with three differences, each recorded where it applies. The server is Node's own http module rather than Hono, for the reasons in api.md. Opening, ending and leaving a children's view live in `server/auth.ts`, and the view's reads and uploads in `server/sync.ts`, which is how [structure.md](structure.md) lays out `server/`, rather than in a `devices.ts`. And a code is checked in two steps, `key_prove` and `key_use` ([db.md](db.md)), so that a person in several families can prove a code and then choose.

The sections on children's privacy law summarise what the rules say and quote them where the design depends on the wording. They are not legal advice. The questions a lawyer should answer before launch are listed near the end, and the design is deliberately conservative in the places where the answer could go either way, so that the answers are unlikely to change it.

## Decided

The owner settled these in September 2026, and nothing below reopens them.

- The schema is seven tables: `families`, `users`, `members`, `kids`, `keys`, `events` and `content`. Foreign key columns are named `family_id`, `user_id` and `kid_id`. Auth adds no table.
- A person has one login, a `users` row, across every family they belong to, and a `members` row in each. There is no role column: a member with no `kid_id` is a parent, and a member with a `kid_id` and a first and last day is a tutor. The database allows one parent row per person per family, and two equal parents in one family is the ordinary case. There is no owner, a family is created with its first parent in one call, and the database never lets a family be left without an active parent.
- A removed member keeps their row with `ended_at` set, so a mark they entered still says who entered it. A membership with `ended_at` set grants nothing.
- Every credential, every secret we email or display, and the family's PIN is a row in `keys`, of one of seven kinds: `session`, `shared-session`, `kid-session`, `pin`, `sign-in`, `confirm` and `invite`. A key has no expiry column: each kind has a rule computed from `created_at` and `seen_at`. A used code is deleted, and the event it produced is the record.
- Sync is our own. PowerSync was trialled and not adopted.
- Consent, and the record of who signed in, joined, left, and opened or ended a children's view, are events in the family's own log. An event's `id` is made by its writer, `(family_id, device, seq)` is unique so each writer's events keep one order, and the kind lives only in `kind`.
- One family's data is never reachable from another's. The store enforces this with row-level security keyed on `app.family` and `app.user`, set for one transaction at a time by `withFamily`, under an application role that owns nothing and cannot bypass the policies.
- The dangerous actions (removing the other parent, deleting a kid, closing the family) need a fresh sign-in and email every other parent. Removing a parent and deleting a kid also record an event; closing the family deletes the log an event would go in, so there the email is the record.
- Kept from the earlier versions of this document: we build auth ourselves; email codes first, passkeys next and no passwords at launch; consent by email plus; and the questions for a lawyer.
- One origin, not three hosts (13 September 2026). The site, the grown-ups' app, the children's view under `/kids` and the API under `/api` are served from one domain on paths, as galleo serves its own, and "Hosts" below says what that changes and what still keeps the two sides apart.
- The sign-in screens follow design B, the map (14 September 2026). The owner first chose design A, the taped sheet on the meadow, and moved to B once the site opened on the sample child's map, because sign-in then continues the site: a visitor who presses Sign in stays on the same map, and the site's sheet is replaced by a postcard. Each step moves the map's camera a little along the road, and the stamp on a step's card shows the place the camera is at.
- A child's view is opened by a parent, and there is no tablet (14 September 2026). A parent signed in on any browser opens the views of one or more of the family's children there, and that browser moves from the parent's session to a kid session, which reaches only those children's own pages and work. Leaving it needs the family PIN, which the server checks, or signing in again. The app is online first: a child's answers are sent as they are made, a short loss of connection is covered by a queue in the browser, and no copy of the log is kept on the device. Pairing codes, tablet keys, erase keys, picture keys and the home-screen requirement are gone, and the key kinds are `session`, `shared-session`, `kid-session`, `pin`, `sign-in`, `confirm` and `invite`.

## Summary

Adults have logins and children do not. A login is a `users` row: an email address that has been proved by a code sent to it, the person's name, and any passkeys they add, held as a list in the same row. No `users` row is written until a code comes back, so there are no unverified logins to guard against. A person belongs to each family through a `members` row, as a parent, or as a tutor whose row names one kid and a window of days. A removed member's row stays, with `ended_at` set and no rights. The helper role an earlier version proposed is dropped: a second grown-up is a parent, or a tutor with a window, and a grandparent who takes a week is served by the handover pack in [parents.md](parents.md) rather than by a seat.

Being signed in is a `session` key: one browser, in one family, with its secret stored only as a hash, behind an HttpOnly cookie. A session on a shared device is a `shared-session` key, with shorter limits. A children's view holds a `kid-session` key for each child it was opened for. Every key's lifetime is a rule for its kind, computed from when it was made and when it was last used. A session can be listed, ended on its own, or ended with every other session the person has in that family. A person in several families is in one of them at a time, and switching family replaces the browser's key with one in the other family.

Every request reaches the database through `withFamily`, which opens a transaction with `app.family` and `app.user` set before any query runs, and every credential names its family, so a request is in exactly one family from its first statement. The only reads that come before a family is known (finding a login by its address, finding a code by its hash, and listing the families a person belongs to) go through a short list of security-definer functions that return only what that step needs.

Sign-in is by an eight-digit code, or by a link that completes in the browser that asked, and later by passkey. Every code and invitation is a key, found by the hash of a secret the caller holds, and deleted when it is used. The rate limits count those same rows, so there is no table of counters.

A kid stays what the store already made them: a name, a grade, and the settings a parent chooses. A parent adds a kid and consents in the same step, which records a `consent-given` event with the notice's version, and the confirming email goes at once and says how to withdraw. Because consent and the record of access are events in the family's log, the proof of consent outlives a kid's deletion without holding their name, and all of it goes when the family is closed.

A child's view is opened by a parent, on a browser where that parent is signed in, for one or more of the family's children with consent. The browser gives up the parent's session in the same step and holds one `kid-session` key per child in an HttpOnly cookie, for as long as a parent's own session would last. Each key can write only its child's events and read back only that child's own work and plan. The view reaches no route an adult uses and no model. It is online first: answers are sent as they are made, a short queue in the browser covers a lost connection, and nothing of the log is kept on the device.

When a view is open for several children, a child picks their own picture from "Who is learning today?", and switching child is switching which of the view's keys the page uses. There is no picture key, so a sibling can open another child's page, which the owner accepted. A grown-up leaves the view by holding the Grown-ups tab and typing the family's four-digit PIN, which the server checks and counts, or by signing in again. Anything that matters is behind a real sign-in in the grown-ups' app.

## What this has to agree with

[product.md](product.md) says a child's account exists under a parent's, that we collect what the product needs to teach and nothing else, that the child's build carries no third-party code and talks to no outside host, and that evidence stays the family's. [parents.md](parents.md) and `scratchpad/src/family/privacy.ts` say a child has "no email address, no password of their own by default, and no way to be contacted", that deleting a child is immediate rather than a soft delete with a recovery window, that the records export runs before a deletion, and that a tutor never sees the family's other children. [ai.md](ai.md) says no model is reachable from a child's device, online or offline. [data-model.md](data-model.md) records that a child's device keeps no copy of the log, and a key per child in a children's view gives each child's work there a stream of its own. The final schema isolates families in the database and keeps a kid to a name, a grade and settings. [structure.md](structure.md) keeps the store out of anything that runs in a child's browser. [journal.md](journal.md) needs a child's device to read what a parent chose for them, which is `kids.settings`.

The design agrees with all of that, and it causes four small changes elsewhere, each listed with its file in "What changes in other documents":

- `privacy.ts` lists "a hash of their password" among what we store. With no passwords at launch, that line becomes the public keys of any passkeys a parent adds.
- `engine/answer.ts`, which declares the event union once, gains the thirteen auth kinds described in "The record of access".
- [db.md](db.md) planned a closure record and a sweep for the retention window after an account closes. We recommend deleting at closure and letting the published window be the time backups take to expire, which needs neither.
- The seed's grown-up device (`study-laptop`) goes, because a grown-up's browser is a session key made at sign-in, not a fixture.

## Who can ask for anything

Three kinds of caller reach the server, and each request is exactly one of them.

An adult is a person signed in: a `session` or `shared-session` key with `user_id` set, in one family. What they may do there is decided by their membership in that family, and a membership with `ended_at` set decides nothing. A login with no session can do very little: ask for a code, prove it, choose a family, start one, or accept an invitation.

A kid session is a `kid-session` key with `kid_id` set, one for each child a children's view was opened for, all of them carried in one cookie. Each acts for its one child and for nobody else.

Nobody is a request with neither. The marketing site and the sign-in requests themselves are the only things that accept one.

A child is not on this list. A child never authenticates to us. Their work arrives under their key in a children's view, and the key is trusted to say which child it is about only because a parent opened the view for that child. Even there we cannot know which child was holding the device, which is a limit the parent's side should state rather than hide (flow 6).

## How a request finds its family

The store keeps families apart with row-level security. Every table that holds a family's data has a policy keyed on `app.family`, which `withFamily({ family, user }, work)` sets with `set_config(..., true)` for the length of one transaction, together with `app.user`. The application connects as a role that owns nothing and cannot bypass the policies. `events`, `members` and `keys` point at a kid through `(family_id, kid_id)` foreign keys, so a row about a kid cannot point into another family. A `users` row is readable only by that user, or through a membership in the current family, and writable only by that user. Auth's part is to make sure every request is in exactly one family before its first query, and to read nothing any other way.

### Every credential names its family

A session cookie, each credential in a children's view's cookie and an invitation's link all have the same shape: `<family>.<key>.<secret>`, which is the family's id, the key's id, and 32 random bytes. For every request that carries one, the entry point in `server/http.ts` does four things in this order.

1. It parses the credential, and does not trust it yet.
2. It opens a short transaction with `withFamily({ family })`, so `app.family` is set before any statement runs.
3. It reads the key by id inside that transaction. Because of the policy, a credential that names a family its key does not belong to finds nothing. It compares the SHA-256 of the secret with `hash` in constant time, applies the expiry rule for the key's kind, and moves `seen_at` when it is due.
4. For a session, it reads the person's membership in this family, and refuses one with `ended_at` set; for a children's view, whose cookie carries one credential per child, it reads each key's child. That is who is asking, in which family and with what reach. The route's own work then runs in a second transaction, `withFamily({ family, user })`, with `app.user` set to the person for a session, since `withFamily` fixes both settings when it opens and the person is not known until the key has been read.

A request that fails any step is refused before it has read anything about the family beyond the one key it named.

A family's id in a cookie is not a secret. It is a random uuid that means nothing outside our database, and it opens nothing without the secret beside it. Putting it in the credential is what lets the entry point set `app.family` before reading anything, rather than first looking the credential up across every family, which would put a function that bypasses the policies on the busiest path in the product.

### Before a family is known

Some steps look for a login before any family is known, or touch keys that belong to no family: asking for a sign-in code, proving it (by typing it or following its link), signing in with a passkey, and confirming a new address or passkey. An invitation is not among them, because its link names its family like any credential. Each of these steps uses a security-definer function in the store that returns only what the step needs:

- for the keys that are found by hash rather than by family (`sign-in` and `confirm`): create one, find one by hash, count a wrong attempt, mark one verified, delete one, and count recent ones by address or by network for the limits;
- for `users`: find a login by address, and find one by id for a passkey. Creating a login, recording a passkey's use and changing an address need no definer function, since the store's policy lets a person write their own row once `app.user` is set to them;
- for memberships: list the active families a person belongs to, as each family's id and name and the person's kid there, if any.

As soon as one of these has said which family, the rest of the step runs through `withFamily` like any other request. The sweeps that act on many families get the ids they need from functions of the same kind, and then work one family at a time through `withFamily`, so what they write is ordinary family data with ordinary events.

### Nothing reads a table another way

`server/` does not import the database driver and does not name a table. It calls functions in `server/db/`, and every store function that touches a family's data takes the `FamilyTx` that `withFamily` gives it, which the store types so that passing it an owner connection is a type error. A guard and a test hold this ("Tests and guards").

### Choosing a family

A person in one family is signed in to it. A person in several (a tutor who teaches three families, or a parent in two) is asked which one after their code or passkey has been accepted, and the session key is made in the family they choose. Later, the account menu lists their other families, and choosing one calls `POST /api/auth/switch {family}`. That confirms the membership through the families function, makes a session key in the new family that carries the old key's `created_at`, so that switching never counts as a fresh sign-in, deletes the old key, and replaces the cookie. One browser is in one family at a time, and no URL carries a family id: the family is always the one the credential names.

Within a family, a tutor's reach is one kid inside a window of days. The entry point works out which kids a member may reach today, in the family's time zone, and passes that to the store's query functions. We recommend going one step further and having `withFamily` also set the tutor's kid for the transaction, so that row-level security enforces a tutor's reach inside a family the way it enforces a family's reach across the database. That is the store's to decide, and it is an open decision.

## What the siblings do, and what we took

Galleo, llamatrade and flowmaestro all wrote their own authentication rather than using a library. All three are worth reading for what they got right and for the failures that were found in them while this document was being written. File references are to each repository's root.

### Galleo

Galleo is Hono on one Render web service with Neon, which is the deployment we are following. Its auth is about eighty lines of `node:crypto` in `services/utils/auth.ts`.

- A session is a stateless signed cookie, `base64url({uid, iat, exp})` plus an HMAC (`services/utils/auth.ts:29-75`): host-only, `HttpOnly`, `SameSite=Lax`, 30 days, with no sessions table.
- Passwords are scrypt at Node's default cost, with the parameters not stored beside the hash (`auth.ts:10-23`).
- Confirming an address is a six-digit code typed into the tab that asked (`services/core/accounts.ts:576-613`).
- Emailed tokens are stored as SHA-256 hashes in `auth_tokens` and consumed by one `update ... where not consumed and not expired returning` (`accounts.ts:333-366`).
- Email goes through Resend with a plain `fetch` and a fixed From address, and prints to the console when there is no key (`services/core/mail.ts:5-17, 84-109`).
- The API and the single-page app are served by the same Hono process on one origin, so the cookie needs no CORS (`.docs/hosting.md`, "The load-bearing decision: one origin").
- Roles are owner, admin and member, applied by per-route middleware (`services/api/middleware.ts:40-79`), and a resource the caller may not see answers 404 rather than 403 (`middleware.ts:81-93`).

Four things in it are flaws rather than choices. A session cannot be revoked on its own: signing out only deletes the cookie (`services/api/session.ts:122-129`), and there is no "sign out everywhere". The Google linking callback reads the cookie with `readSession` rather than `currentUser`, so it skips both the revocation check and the confirmation gate (`services/api/oauth.ts:126, 205`), which is an account takeover path. Invitations are accepted by whoever holds the link, with no check that their address matches (`services/core/workspaces.ts:252-280`). And the rate limiter keeps its counters in an in-process `Map` keyed on the `cf-connecting-ip` header (`services/utils/http.ts:130-203`); a comment there says Render's Cloudflare front overwrites that header, which we have not been able to confirm from Render's documentation, and if it does not, the header is the client's to set.

What we take: Hono, and each app served with its API by the same process; the code typed into the tab that asked; hashed single-use tokens consumed by one atomic update; Resend by `fetch` with a console fallback in development; refusing to boot in production without the secrets; 404 for anything the caller may not see; and an access rule that the browser and the server both read. What we change: a session is a row in `keys`, so that it can be ended on its own; proving the address is not a gate on a login that already exists but the condition for the login existing, which removes the class of bug where one door forgot the gate; invitations are bound to the invited address; limits are counted from rows we keep anyway rather than from an in-process map; and passwords, if they ever ship, are argon2id with the parameters in the stored string. What we leave out: the stateless cookie, the OAuth code, and the development bypass code (`123456` whenever `NODE_ENV` is not production, `model/workspace.ts:248-251`), which we replace with the console printing the real code.

### Llamatrade

Llamatrade is Python, and nothing in it is code we could reuse, but several of its decisions carry over.

- A session is a 30-minute access JWT and a 7-day refresh JWT, both in the browser's `localStorage` (`apps/core/src/stores/auth.ts:66-94`), with revocation and rate limiting in Redis (`libs/common/llamatrade_common/revocation.py:27-80`, `ratelimit.py:30-63`).
- Passwords are bcrypt at the library default, with a precomputed dummy hash checked when the address is unknown so that a miss takes as long as a wrong password (`services/auth/src/grpc/servicer.py:55-57, 595-609`).
- Reset and verification tokens are SHA-256 hashed and single use under `select ... for update`, and issuing a new one retires the older ones (`services/auth/src/services/tokens.py:22-90`).
- Tenancy is enforced a second time by row-level security with a transaction-local setting (`libs/db/llamatrade_db/rls.py:39-171`).

Two findings from it matter here. Security emails go to every active user in the tenant rather than to the account they concern (`services/notification/src/pipeline.py:82-104`). And the raw reset links are stored in the notifications table (`pipeline.py:146-220`), which undoes the hashing.

What we take: the dummy-hash timing pad if passwords ever ship, the same answer whether or not an account exists, ending every session when a credential changes, a limiter that refuses rather than allows when its store is unavailable, two keys per limit (the address and the network), and row-level security keyed on a transaction-local setting, which the final store has adopted for isolating one family from another. What we change: revoking is deleting a row, and limits are counted from Postgres rows. What we leave out: tokens in `localStorage`, a security email sent to anyone but the person it concerns, and links persisted anywhere.

### Flowmaestro

Flowmaestro is Fastify with `@fastify/jwt`.

- A session is a JWT with a 100-year lifetime (`backend/src/core/config/index.ts:128-129`), held in `localStorage` and never revocable.
- Passwords are PBKDF2 with the parameters not stored beside the hash (`backend/src/core/utils/password.ts:6-22`).
- Email is Resend with React Email templates.
- Roles are declared once in the shared package as `ROLE_PERMISSIONS` and read by both sides (`shared/src/workspace.ts:69-106`), and applied by middleware in sequence (`backend/src/api/routes/workspaces/members/invite.ts:26-30`).
- It has an RFC 8628 device authorisation flow for its command line tool (`backend/src/api/routes/oauth/device.ts`), with its state in Redis.

The review of it found several takeover paths, the worst being that registering with the address of a Google-only account sets a password on that account (`backend/src/api/routes/auth/register.ts:29-42`).

What we take: the role-to-capability table declared once and read by the server and the parent's app, and the middleware order (who is asking, then which family, then may they). Its device authorisation flow, which an earlier version of this document used, is no longer needed. What we leave out: long-lived bearer tokens, linking accounts by email, SMS codes, and tokens in query strings, where they reach request logs and analytics.

### What all three teach

None of the three has a sessions table, account deletion or data export, and each has at least one path where a door forgot a check that the other doors make. We read that as an argument for two properties of this design more than as an argument for any library: every request passes through checks made in one place, from a route table a test can walk, and the rule that decides who may do what is data rather than a scattering of conditions.

## Build it ourselves, or use a library

The owner has decided that we build it ourselves. The comparison is kept because it is the record of why, and because the fallback it names is what we would reach for if that decision were ever reopened.

### What the choice is judged against

Six constraints, from the owner's brief and the documents above. No third party sees anything about a child. Children have no email and no password, and a child reaches their pages only through a view a parent opened. The store is Postgres with no Redis. It costs little at a few thousand families. The licence lets us ship it. And adults sign in with email-based methods, with passkeys worth having.

The second constraint decides more than it looks as if it should. No option in the field has a concept of a browser a parent hands over to several children, which acts for each of them and gives a grown-up's session back only for a PIN, so every option leaves the children's view, the family PIN, tutor windows and the consent record for us to build. The real question is only about the adult half: whether email codes, sessions, passkeys, invitations and rate limits come from a library or from us.

### The field, in September 2026

Versions and dates are from the npm registry, the projects' own pages and the GitHub Advisory Database, read on 12 September 2026; each is listed in "Sources".

| Option | State | What it would mean here |
|---|---|---|
| Better Auth | 1.7.4, MIT, released 10 September 2026. Joined Vercel on 7 July 2026, and has maintained Auth.js since September 2025 | Covers the adult half in our own process on our own Postgres: email codes, magic links, a passkey plugin built on SimpleWebAuthn, an organisation plugin with members and invitations, rate limits stored in the database, and a Drizzle adapter. Nothing for devices |
| Auth.js (NextAuth v5) | v5 still in beta at 5.0.0-beta.32; maintained by the Better Auth team for security fixes, which recommends Better Auth for new projects | Rejected. Maintenance only, WebAuthn marked experimental, and its credentials provider requires JWT sessions |
| Lucia | The library was deprecated in March 2025. The site now offers one 0BSD file, `auth_session.ts`, last changed in July 2026, as a replacement to copy | The session shape we recommend copying |
| The Copenhagen Book and the Auth Book | The Copenhagen Book's repository was archived in June 2026 and replaced by the Auth Book, by the same author | The guidance we follow for codes, passkeys, CSRF and limits |
| Neon Auth | Now "Managed Better Auth", in beta, on Better Auth 1.4.18, run by Neon as a service with its users in our Neon database. No passkeys, and a separate backend is not yet supported | Rejected for now. We could not confirm that fixes released after 1.4.18 are backported |
| Supabase Auth | Go server 2.197.0, MIT. Hosted is free to 50,000 monthly users; passkeys are experimental | Rejected. Its users live in Supabase's Postgres, or we run a second service |
| Clerk, WorkOS AuthKit, Auth0, Firebase Auth | Hosted, with free tiers from 25,000 to 1,000,000 users | Rejected. A third party would hold every adult identity and see which logins belong to which family, and we found no guidance from any of them for their customers' child users |
| Ory Kratos, Keycloak, SuperTokens, Stack Auth (whose site now redirects to Hexclave) | Self-hosted servers in Go or Java, or with an AGPL server | Rejected. A second service to run, for the smaller half of the problem |

### What we recommend, and why

We recommend building the adult half ourselves, following two documents rather than taking a dependency: Lucia's `auth_session.ts` for sessions, and the Auth Book for email codes, passkeys and rate limits. Passkeys use `@simplewebauthn/server` 14.0.1 and `@simplewebauthn/browser` 14.0.0, both MIT, because verifying a WebAuthn response means parsing CBOR and COSE, and that is not code we should write. Everything else uses `node:crypto` on the server and WebCrypto in the browser. We estimate the adult half at eight hundred lines, most of them in `server/auth.ts`; we have not written it, so that is an estimate.

The reasons, in the order they weigh.

The half a library would give us is the smaller half. Sessions, codes, invitations and limits are each about a page of code, and a library's version of each would bring tables of its own that then have to be mapped onto `users`, `families` and `members`. Better Auth's organisation plugin would either duplicate `families` and `members` or be configured onto them, and its roles have no notion of one kid and a window of days, which a tutor's `members` row carries.

One set of rules is easier to keep than two. With a library for adults and our own code for children's views, there would be two ways of storing a token, two rate limiters and two places auth events come from. Written together, there is one token rule (a random secret, stored as its SHA-256), one table for every credential and every secret we email or display (`keys`), and one record of what happened (the family's own log).

Better Auth stores session tokens as issued. The research for this document read the 1.7.4 source and found `createSession` storing `generateId(32)` unhashed, with no option to hash it; that comes from the source rather than the documentation. [db.md](db.md) already decided the opposite for device secrets ("only the hash, so a database leak cannot replay the credential"), and in the final schema an adult's session and a child's key in a children's view are rows in the same `keys` table with the same `hash` column.

The advisories fall where we would be. Between May and July 2026 the GitHub Advisory Database lists, for Better Auth, a pre-account hijacking on magic link and email code sign-in (GHSA-qq9h-g4jm-xgf3, high), organisation invitations accepted on an unverified email match (CVE-2026-53514, high), and a rate limiter bypass by rotating IPv6 addresses (CVE-2026-45364, high). Those are the three features we would use. A library with many users has more of its bugs found, and that is a real argument for it. The counter-argument is that our surface is smaller than theirs, with no OAuth and no passwords, and that every flow in this document is also a test.

The objection to building it ourselves is the siblings: three hand-written auth layers, and the review found takeover paths in two of them. We think those failures came from surface (OAuth linking, passwords, stateless tokens nobody could revoke) and from checks spread across routes, and the design below removes both. If the owner would rather take a library anyway, Better Auth 1.7.4 or later is the one to take: for adults only, with its email code plugin set to store codes hashed, its rate limits stored in the database, its trusted proxies set for Render, and its organisation plugin configured onto `families` and `members`. The children's half would stay as written here either way.

### Which sign-in methods ship first

The owner has settled the order: email codes first, with a link in the same email that completes sign-in when it is opened in the browser that asked; passkeys next, in the first release if the order of work allows; and no passwords at launch. The reasons below are the record of that decision.

Email codes come first because every other flow needs them anyway. Proving an address, accepting an invitation, recovering an account and confirming consent all send an email, so sign-in by code is one more use of machinery we have to build regardless. The Auth Book prefers codes to links ("my preferred option compared to using single-use verification links"), and we do too, for two reasons that are specific to a family. An emailed link opens in whatever browser the mail app chooses, which on a phone is often an in-app browser or Safari rather than the home-screen app the parent started in. And mail security scanners in some organisations fetch links before a person does, which consumes a single-use link. A code typed where it was asked for has neither problem. The link stays, as a convenience, and only completes in the browser that asked (flow 2).

Passwords come last, or never, for reasons about this product rather than about passwords in general. On a device the family shares, a password is typed in front of children, and the browser on a shared device offers to save it. NIST SP 800-63B-4, final in July 2025, says a verifier "SHALL require passwords that are used as a single-factor authentication mechanism to be a minimum of 15 characters", which is more than we would ask of a parent signing in on a shared device with two children waiting, and a shorter minimum would fall below it. A password also brings a breach check, defences against credential stuffing, and a reset flow that goes by email, so an account with a password and no second factor is no stronger than its inbox anyway. If passwords are wanted later, "If passwords ship" says how.

Passkeys are the strong method, and the only one here that resists phishing. They work on a parent's own phone and laptop, sync through the platform's keychain, and let a parent sign in on a shared device by scanning a QR with their phone, which the operating system does, so our code never touches a camera. NIST 800-63B-4 allows synced passkeys up to its second assurance level.

One thing should be said plainly. NIST 800-63B-4 says "Email SHALL NOT be used for out-of-band authentication", so a code sent by email is not an authenticator in NIST's terms, and signing in by email code makes an account exactly as strong as the parent's email account. That is also true of every product whose password reset goes by email, which is nearly all of them. It is why we would ship passkeys early, and why a later step adds a setting that stops email codes signing in to an account once it has a passkey.

### If passwords ship

A password is at least 15 characters and at most 128, with no composition rules, checked against a breached-password list, and hashed with argon2id at the OWASP Password Storage Cheat Sheet's second setting ("m=19456 (19 MiB), t=2, p=1"), stored as a PHC string so the parameters can be raised later. Node added `crypto.argon2` in 24.7.0, which returns a raw key and needs the PHC encoding written around it; `@node-rs/argon2` 2.2.1 does the encoding and defaults to those same parameters. A breach check through the Have I Been Pwned range API sends the first five characters of the password's SHA-1 to a third party, which is information about an adult rather than a child, and the owner should decide whether that is acceptable. Sign-in runs the hash against a dummy when the address is unknown, as llamatrade does. A reset is a code to the address, a new password, and every session ended. None of this is in the schema, because we are not recommending it; a password hash would need one nullable column on `users`, which is the only schema change passwords would bring.

## Children's privacy law

This section is not legal advice. It records what the rules say, quoting the text where the design depends on it, and what the design does in response. The research was done in September 2026 against primary sources, listed in "Sources". What we could not settle is in "Questions for a lawyer".

### United States: COPPA

The FTC finalised the amended COPPA Rule on 16 January 2025. It was published in the Federal Register on 22 April 2025 (90 FR 16918), took effect on 23 June 2025, and gave regulated operators until 22 April 2026 to comply. It is in force.

Personal information (16 CFR 312.2) includes "a first and last name", "a screen or user name where it functions in the same manner as online contact information", "a persistent identifier that can be used to recognize a user over time and across different websites or online services", which "includes, but is not limited to, a customer number held in a cookie, an Internet Protocol (IP) address, a processor or device serial number, or unique device identifier", "a photograph, video, or audio file where such file contains a child's image or voice", biometric identifiers now including voiceprints and facial templates, and "information concerning the child or the parents of that child that the operator collects online from the child and combines with an identifier described in this definition". A first name alone is not on the list. A child's answers and drawings, once they reach our server under a child id and a device id, fall under the last clause.

The FTC's staff FAQ (F.5) says: "You are not collecting personal information simply because your app interacts with personal information that is stored on the device and is never transmitted." The app is online first, so a child's answers reach us as they are made, and the moment of collection is the first answer a children's view sends. In this design consent comes before a view can be opened for a child, and so before anything is sent.

Verifiable parental consent may be obtained by any method in 312.5(b)(2): a signed form, a payment card transaction, a staffed phone line, a video call, a check of government ID, knowledge-based questions, a face match to photo ID, and two methods limited to operators who do not disclose. We use (viii):

> Provided that, an operator that does not "disclose" (as defined by § 312.2) children's personal information, may use an email coupled with additional steps to provide assurances that the person providing the consent is the parent. Such additional steps include: Sending a confirmatory email to the parent following receipt of consent, or obtaining a postal address or telephone number from the parent and confirming the parent's consent by letter or telephone call. An operator that uses this method must provide notice that the parent can revoke any consent given in response to the earlier email.

The staff FAQ (I.4) describes the confirming step as a second message sent "after a reasonable time delay" that repeats the direct notice and explains how to revoke. The 2025 amendment renumbered this method without changing its words, and when adopting the new "text plus" method the FTC restated that both "can only be utilized when an operator does not 'disclose' children's personal information".

Whether we disclose is the hinge of the whole consent design. "Disclose" and "third party" in 312.2 exclude a person "who provides support for the internal operations of the website or online service and who does not use or disclose information protected under this part for any other purpose". Render, Neon and our email provider are service providers in that sense, and the amended 312.8(c) requires us to take reasonable steps to confirm they can protect children's information and to obtain written assurances that they will. A model provider receives no child's personal information under [ai.md](ai.md), where the prompt carries a grade and a token and never a name; the preamble to the amended rule names disclosure "to train or otherwise develop artificial intelligence technologies" as not integral to a service and needing separate consent, which is one more reason the prompt assembler in [ai.md](ai.md) is the only path to a model. A tutor a parent invites, and a school district a parent shares records with, are harder cases, and both are on the lawyer's list.

Two of the exceptions in 312.5(c) touch this design. Exception (1) allows collecting a parent's contact details "where the sole purpose ... is to provide notice and obtain parental consent", with deletion if consent does not follow. Exception (7) allows collecting "a persistent identifier and no other personal information" used "for the sole purpose of providing support for the internal operations". Nothing is collected from a device before a parent acts: a children's view is opened by a signed-in parent, for children who have consent, and the keys that stamp a child's work are made in that step. The view's cookie is a persistent identifier collected after consent and used only to support the internal operations of the service, and it lasts no longer than a parent's own session would.

Parents' rights under 312.6 are a description of what we collect, "the opportunity at any time to refuse to permit the operator's further use or future online collection of personal information from that child, and to direct the operator to delete the child's personal information", and "a means of reviewing any personal information collected from the child" that must "ensure that the requestor is a parent of that child, taking into account available technology". Those are the export, the deletion and the withdrawal of consent below. All three are available only to a signed-in `parent` of the family, which is this design's answer to that requirement; whether it is enough is question 5 for the lawyer.

The amended rule also requires a written information security programme (312.8(b)) with a named coordinator, annual risk assessment and testing, and a written retention policy that sets out the purposes, the business need and "a timeframe for deletion", published in the online notice, with the flat statement that "Personal information collected online from a child may not be retained indefinitely" (312.10). This design feeds both documents: credential hashing, the expiry rule for each kind of key, the record of access in the family's log, and the inactivity rule in flow 12 are entries in them.

Schools may consent on a parent's behalf for an educational purpose, under long-standing FTC guidance (FAQ N.1), but the 2025 rule declined to codify it, and the FTC's 2023 order against Edmodo barred "using schools as intermediaries in the parental consent process". We do not rely on it. The family consents, and the family stays the unit, as [product.md](product.md) says.

A child's voice is covered by the 2017 enforcement policy and the new 312.5(c)(9), which allow audio collected only to answer a request and deleted immediately. We collect no audio at all, and `check:privacy` refuses the microphone and camera APIs in code, so this does not arise.

### Canada

We are based in Ontario, which has no general private-sector privacy statute, so PIPEDA governs our commercial activity, as it does personal information that crosses provincial or national borders.

The Office of the Privacy Commissioner's Guidelines for obtaining meaningful consent (2018, issued with the Alberta and British Columbia commissioners) say: "where a child is unable to meaningfully consent to the collection, use and disclosure of personal information (the OPC takes the position that, in all but exceptional circumstances, this means anyone under the age of 13), consent must instead be obtained from their parents or guardians." Our model has no flow in which a child consents to anything, which agrees.

The federal, provincial and territorial commissioners' joint resolution of October 2023 says young people's information is "particularly sensitive", asks for the most protective settings by default, and asks organisations to "make any monitoring or tracking obvious to the young person". That last request is one the design took into the child's surface until the owner removed the sign on 14 September 2026 ("What the child is told").

Bill C-27 died when Parliament was prorogued in January 2025. Its successor, Bill C-36, which would enact the Protecting Privacy and Consumer Data Act, was introduced on 15 June 2026 and was awaiting second reading when this was written. As introduced it defines a child as under 18, treats a child's personal information as sensitive, lets a parent exercise a child's rights "unless the child wishes to personally exercise those rights and is capable of doing so", and narrows the grounds for refusing a request to dispose of information that concerns a child. None of that conflicts with this design, and the lawyer's list asks which of it to build for now. The OPC consulted on a Children's Privacy Code in 2025 and says it is preparing one; we found no draft published by 10 September 2026.

If we serve families in Quebec, its private-sector act says personal information about a minor under 14 "may not be collected from him without the consent of the person having parental authority or of the tutor" (s. 4.1), that products must "provide the highest level of confidentiality by default" (s. 9.1), and that an assessment is required before personal information is communicated outside Quebec (s. 17), which our hosting would do.

### United Kingdom

The ICO's Age Appropriate Design Code has applied since 2 September 2021 to information society services "likely to be accessed by children" in the UK, children meaning anyone under 18, including services based elsewhere that are offered to UK users. Of its fifteen standards, the ones that bear on this design are high privacy by default, data minimisation, and parental controls: "If your online service allows a parent or carer to monitor their child's online activity or track their location, provide an obvious sign to the child when they are being monitored." The parent's side is monitoring in that sense.

UK GDPR article 8 sets 13 as the age at which a child can consent to an information society service themselves, and since 29 April 2026 the Secretary of State may raise it to between 13 and 16 by regulation. The Data (Use and Access) Act 2025 added a duty to take into account "the children's higher protection matters" when designing such services, in force from 5 February 2026; the ICO says conforming to the code satisfies it. The ICO's view is that the core processing of a service like ours more naturally rests on a contract than on consent, which would change what the consent in flow 4 means for UK families. That is on the lawyer's list.

### European Union

GDPR article 8(1): "Where point (a) of Article 6(1) applies, in relation to the offer of information society services directly to a child, the processing of the personal data of a child shall be lawful where the child is at least 16 years old. Where the child is below the age of 16 years, such processing shall be lawful only if and to the extent that consent is given or authorised by the holder of parental responsibility over the child." Member states may lower the age to 13. Article 8(2): "The controller shall make reasonable efforts to verify in such cases that consent is given or authorised by the holder of parental responsibility over the child, taking into consideration available technology." Recital 38 says children "merit specific protection". The EDPB's guidelines on consent (05/2020, paragraph 137) say: "In low-risk cases, verification of parental responsibility via email may be sufficient." Whether our service is offered "directly to a child" when a parent holds the account, and which lawful basis applies, are on the lawyer's list.

### US state law, and FERPA

California's Age-Appropriate Design Code was partly revived on 12 March 2026, when the Ninth Circuit vacated the injunction against the whole Act while keeping parts of it enjoined; it reaches only businesses above the California Consumer Privacy Act's thresholds. California's student privacy law, now titled the K-12 Pupil Online Personal Information Protection Act, reaches operators of services "designed and marketed for K-12 school purposes", which a home curriculum marketed to parents is not squarely inside. FERPA applies to schools that receive federal funds and limits what we may do with records they send us, which arises only if a district sends records. All three are on the lawyer's list.

### What the design does with all of it

A child has no account and never consents. A parent consents for each child when adding them, to a notice that says what the child's view records and sends, and the consent is recorded as a `consent-given` event carrying the notice's version, so that a material change asks again. The method is email plus, which we may use only while we disclose nothing about a child to a third party, so that becomes a rule the design keeps: nothing about a child goes to anyone but our own service providers under written assurances, and the email provider in particular never receives a child's name or work. The first transmission of a child's work waits for consent, because a children's view cannot be opened for a child without it. Deletion is immediate, export is one action, withdrawing consent stops collection at once, and all three are available only to a signed-in parent of the family. The child is told, in words a five-year-old can follow, that a grown-up can see their pages. And nothing is kept indefinitely: every row auth writes has a stated lifetime or an event that ends it.

## A kid, and what a parent consents to

### What identifies a kid

Inside our systems a kid is their `kids.id`, a random uuid, and nothing else identifies them. The row is a name, a grade and `settings`, and auth adds nothing to it beyond one entry in `settings`. Everything else that concerns a kid points at the row through a `(family_id, kid_id)` foreign key: their events, any tutor's membership, and the `kid-session` keys that act for them in any children's view. Deleting the kid removes all of those through the foreign keys, which cascade as every foreign key in the store does, and a view keeps nothing of the child's on the device that would need erasing (flow 12).

The name is what the family calls the child, and the form says a nickname is fine. We do not ask for a surname, a birth date, an age, a school, a photograph or a gender, and the form has no field that could hold one. The grade is the grade the year is drawn for.

In a children's view a child finds themselves by a picture as well as a name, because a five-year-old may not read their own name reliably. The picture is one of the shelf's twelve creatures, and `engine/ui/pictures.ts` gives each child in a family a different one: the one `kids.settings` names, when the shelf can draw it and no brother or sister named it first, and otherwise the next one free. It stays the same while the family does, and repeats only in a family of more than twelve children.

### What the parent consents to

Adding a kid is one screen, with the notice and the form together, so the parent reads what they are agreeing to at the moment they are thinking about this child. The notice's wording is a lawyer's to write against 312.4(c). What it has to say, in this design, is that a children's view opened for this child records the child's answers, the drawings and marks a question asks for, the hints they open, the games they play and how long each question took on screen; that it sends those to us as they happen, and to nobody else; that we keep them while the family is open and delete them within a stated time after it closes; that we never send the child's name or work to a model provider or anyone else; and that the parent can see all of it, export it, withdraw consent and delete the kid at any time. The parent ticks one box and presses Add.

What is written is the `kids` row and a `consent-given` event, in one transaction. The event is recorded against the family rather than the kid, with `kid_id` null and the kid's id, the notice's version and the method (`email-plus`) in its data, so that it is not removed if the kid is later deleted, and it holds no name. The confirming email goes to the consenting parent at once: which family, when consent was given, a summary of the notice, and how to withdraw, which is to sign in and press Withdraw on the kid's page. It links to that page, and it does not name the child. It carries no withdrawal token, because a code lasts ten minutes and a withdrawal link has to work weeks later; signing in to withdraw costs a parent one code and keeps a lasting secret out of their inbox.

Consent is what allows a children's view to be opened for the kid. Without an active consent, which is the latest `consent-given` for that kid with no later `consent-withdrawn`, the card that opens a view does not offer the kid, and the server refuses it with `no-consent`. A parent who only prints and marks paper never needs a children's view, and consenting costs them nothing; we take consent at the same step anyway, because a second consent moment later on is a place where families get lost, and one rule, that a kid is added with consent, is easier to keep than two.

Withdrawing consent stops collection at once, and the mechanism is the kid's own keys. The server records `consent-withdrawn`, deletes every `kid-session` key for that kid, and records `kid-session-ended` with the reason `withdrawn`. From that moment nothing about the kid is accepted, the view's next request for that child is refused, and any other child in the same view carries on under their own key. The parent is then asked, in the app, whether to delete what we hold now or keep it. Keeping it does not restart collection, and export and deletion stay available.

When the notice changes materially, the next time a parent opens the app they are asked to consent to the new version, which records a new `consent-given`. Collection the old notice covered carries on meanwhile; anything the new notice adds does not start for a kid until a parent consents to it. The first likely case is already in view: [journal.md](journal.md) leaves open whether the working a child writes in the journal's margins stays on the device or travels with the attempt beside it, and if it ever leaves the device, that is a new version of the notice.

## Sessions and credentials

### How long a key lasts

A key has no expiry column. Each kind has a rule, computed from `created_at` and `seen_at`, and the entry point applies it on every request; a sweep deletes keys whose rule has run out.

| Kind | What it is | It lasts |
|---|---|---|
| `session` | A person signed in on their own device | 30 days since `seen_at`, and never more than 90 since `created_at` |
| `shared-session` | A person signed in on a shared device, or back from a children's view with the PIN when the session put away for it had run out | 30 minutes since `seen_at`, and never more than 12 hours since `created_at` |
| `kid-session` | One child's key in a children's view | 30 days since `seen_at`, and never more than 90 since `created_at` |
| `pin` | The family's PIN | until a parent sets it again, or the family closes |
| `sign-in` | An emailed code and link, or a passkey challenge | 10 minutes |
| `confirm` | A code that confirms a new address, or the challenge for adding a passkey | 10 minutes |
| `invite` | An invitation to a parent or a tutor | 7 days |

A code that is used is deleted, and the event it produced is the record of it: `signed-in` for a sign-in, `member-added` for an invitation, and `login-changed` for a new address or passkey. A code that runs out unused is kept for a day, so that the rate limits can count it, and then swept.

The Copenhagen Book's default for a session is 30 days, extended when it is used within the last 15; Lucia's current file uses 10 days; NIST 800-63B-4 asks that sessions at its first assurance level be reauthenticated at least every 30 days. We took 30 days of idleness and an absolute limit of 90 days, which is longer than NIST's overall limit for that level. The idle limit already ends the session on a phone that is lost and never used again; the absolute limit bounds a session somebody else keeps alive, such as on a phone that was stolen rather than lost, and 90 days spares a family that uses the product daily from signing in again every month. The shared-device limits are inside NIST's numbers for its second level, which are an hour idle and 24 hours overall.

### An adult's session

A session is a `session` or `shared-session` key. Its columns mean:

| Column | For a session |
|---|---|
| `id` | The session's id, which is also the stamp on anything this browser writes to the log |
| `family_id` | The one family this browser is in |
| `user_id` | Who is signed in |
| `name` | The browser and kind of device, from the user agent, shown in the session list: "Safari on an iPad" |
| `hash` | The SHA-256 of the secret half of the token |
| `created_at` | The moment the person proved themselves for this session, by code, link or passkey. A switch of family carries it over unchanged |
| `seen_at` | When it was last used: moved by a request only when it is at least a day old for a `session`, and at least a minute old for a `shared-session`, whose idle limit is thirty minutes. A move is when a `session`'s cookie is sent again |
| `detail` | `pin: true` on a session the family's PIN gave, which is then never a fresh sign-in; `putAway: <view>` while the session is put away for a children's view open on its browser (flow 5) |

The token is `<family>.<id>.<secret>` with a 32-byte secret in base64url, which is the shape of Lucia's `auth_session.ts` with the family in front. A copy of the database cannot be turned into a session, because only the hash is stored.

The cookie is `__Host-ls_session`: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and no `Domain`. For a `session` its `Max-Age` is thirty days, cut short so that it never reaches past ninety days after `created_at`, and the cookie is sent again with a fresh `Max-Age` whenever `seen_at` moves, since a browser would otherwise drop it thirty days after sign-in however often it was used. A `shared-session` has no `Max-Age`, so its cookie ends with the browser. The `__Host-` prefix makes the browser refuse a cookie of that name from anywhere but the domain itself, so a page on a subdomain of `lumischool.ai` cannot plant one. In development, where the server is not on HTTPS, the prefix and `Secure` are dropped, as galleo drops `Secure`.

There is no refresh token. The key is the refresh: using a session moves `seen_at`, so an ordinary day costs no more than one write.

A fresh sign-in is a session whose `created_at` is within the last ten minutes. The actions that give someone or something new access to a kid's record, or destroy one, need it: inviting a parent or a tutor, setting the family's PIN, exporting, deleting a kid, closing the family, and removing the other parent, as well as changing the email address and adding a passkey. Opening a children's view does not, since it leaves the browser with less than it held. A session a grown-up got back with the family's PIN, whether their own restored or a shared one made for them, is never fresh, whatever its `created_at`, since a PIN says nothing about who typed it. When the session is older, the app asks for a passkey or a code, and signing in again replaces the key with a new one whose `created_at` is now: when the browser sends a session cookie of the same person, that key is deleted in the same transaction that makes the new one, whichever family each is in. Switching family deletes the old key in the transaction that makes the new one too.

Signing out deletes the key and clears the cookie. "Sign out everywhere" deletes every session key the person has in this family, this one included. Changing the email address, and adding or removing a passkey, end the person's other sessions in every family they belong to, and record `login-changed` in each: the server lists those families through the families function and works in each through `withFamily`. Removing a member sets `ended_at` on their membership and deletes their session keys in that family in the same transaction, so their next request finds nothing.

Every request that is not a `GET` or `HEAD` must carry an `Origin` header equal to the app's origin, and a `Sec-Fetch-Site` of `same-origin` or `same-site` when the browser sends that header; a request without an `Origin` is refused, as the Copenhagen Book advises. `same-site` is accepted for a local page that calls the API's own port, which is another origin on the same site, and it opens nothing more in production, where the `Origin` must still be the app's own. Every `POST` must declare `Content-Type: application/json`, one with an empty body included, since a page elsewhere can send a body-less `POST` of another type without asking first; the parser refuses any other type or none, and reads an empty body as `{}`. `SameSite=Lax` is not the defence here: on one origin the cookie goes with every request the page makes, the children's view's included, so what refuses a request from anywhere else is the `Origin` check, and what keeps the two sides apart is the route table, which reads one cookie on each route, and the server's refusal of a session put away for a children's view on every adult route ("Hosts"). Galleo's body parser reads any request body as JSON whatever its declared type (`services/utils/http.ts:35-47`), which is the gap the content type rule closes.

### A children's view's keys

A children's view holds one `kid-session` key for each child it was opened for. Each key's `id` is the stamp on every event it writes, so each child's work in a view is its own stream, numbered by the server. `kid_id` is the child, `user_id` is the parent who opened the view, `name` is the browser and kind of device from the user agent, `hash` is the SHA-256 of the key's secret, `seen_at` is when it was last used, and `detail` holds a view id that all of the view's keys share, so that the family's page can show one view with its children and a parent can end it in one action. Deleting a child deletes their keys through the `(family_id, kid_id)` foreign key.

Each key's credential has the same shape as a session's, `<family>.<id>.<secret>`, and the view's cookie carries them all, joined by `~`. The cookie is `__Host-ls_kids` (`ls_kids` locally): `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` over HTTPS. Script cannot read it, so nothing that runs on the page can copy the keys. Its `Max-Age` runs to the moment the lifetime rule would end the keys, and it is sent again whenever `seen_at` moves. The `/api/kid/` routes read only this cookie, every other route reads only the session cookie, and no route reads an `Authorization` header.

A browser that holds a view's cookie holds its session's cookie beside it, put away. Opening a view keeps the parent's session key on that browser and marks it in `detail` with the view it was put away for, in the same transaction that makes the view's keys; every adult route refuses a put-away session with `401 put-away` and keeps its cookie, since the family's PIN gives it back (flow 7), and the kid routes never read it. Being put away moves nothing: the key runs out exactly as it would have, thirty days since `seen_at` and ninety since `created_at`, and a refused use does not move `seen_at`. A sign-in on a browser that holds a view's cookie reads that cookie only to end the view, records `kid-session-ended` with the reason `sign-in`, clears it, and replaces the session that was put away, as a sign-in replaces any session the browser held.

A kid session lasts as a parent's own session does, thirty days since `seen_at` and ninety since `created_at`, with `seen_at` moved at most once a day, because a parent opened it and it should outlast nothing the parent's session would not. Running out records nothing. A view ends early, and records `kid-session-ended` with its reason, when a parent ends it from the family's page (`ended`), when a grown-up leaves it with the PIN (`pin`), when someone signs in on that browser (`sign-in`), when a child's consent is withdrawn (`withdrawn`), or when the parent who opened it is removed from the family (`removed`); the last two are not built yet. Deleting a child takes their keys with them, and `kid-deleted` is the record. There is no rotation: a copied cookie works until the view ends, and a parent who suspects one ends the view from the family's page.

The family's PIN is one `pin` key per family, which a partial unique index keeps to one. Its `hash` is an HMAC under `AUTH_PEPPER` of the family's id and the four digits, so a copy of the table cannot be turned back into ten thousand PINs, `user_id` is the parent who set it, `attempts` counts wrong tries in a row, and `seen_at` is the last wrong one. It lasts until a parent sets it again or the family closes, it is never kept on a device, and setting it needs a fresh sign-in. A forgotten PIN is replaced by signing in and setting a new one.

### What each build carries

| | The children's build | The grown-ups' build |
|---|---|---|
| Path | `/kids`, and `/` for a browser that holds only a children's view | everything but `/kids` and `/api` |
| Who it acts as | The children a parent opened the view for: one `kid-session` key per child | A person: a `session` or `shared-session` key, in one family |
| Credential | `__Host-ls_kids`, HttpOnly, carrying one `<family>.<id>.<secret>` per child | `__Host-ls_session`, HttpOnly, which script cannot read |
| Lifetime | 30 days idle and 90 absolute, unless a parent, the PIN or a sign-in ends it first | 30 days idle and 90 absolute; 30 minutes and 12 hours on a shared device |
| Routes it can reach | `/api/kid/*` and nothing else, which `check:kids-build` checks in the built chunks | Everything under `/api/` except `/api/kid/*` |
| Third-party code | None, enforced by `check:privacy` | `@simplewebauthn/browser`, bundled, MIT, which makes no requests of its own |
| Network | Its own origin only | Its own origin only |
| With no network | Keeps unsent answers in a queue in IndexedDB and sends them when it is back | Shows what it has; a change waits until it is back and signed in |
| AI generation | No route exists | Parents only, charged to the family |
| Secrets kept on the device | None; the PIN is checked on the server | None |

### Hosts

One Render web service serves one domain from one process: the marketing site, the grown-ups' app, the children's view under `/kids`, and the API under `/api`, on paths rather than hosts. This is how galleo serves its own app and API, and the owner chose it over the three hosts this section first set out (`lumischool.ai`, `app.lumischool.ai` and `kids.lumischool.ai`), for one origin to run, test and deploy.

| Path | What it serves | Credentials accepted |
|---|---|---|
| `/api/kid/*` | The children's view's routes | The children's view cookie only; the session cookie is ignored |
| every other `/api/*` | The adults' routes | The session cookie only; the children's view cookie is ignored |
| `/kids` and below | The children's view | None of its own; it calls only `/api/kid/*` |
| `/home` | The site, for everyone, so a parent who is signed in can still open it from the logo | None; it asks `/api/me` once, as flow 13 says |
| `/` | The children's view for a browser with a children's view cookie, whose session cookie, if it has one, is put away for that view; the grown-ups' app, which shows the family's page, for a browser with a session cookie and no view; and the site otherwise | As the app or the site it serves |
| everything else | The grown-ups' app: `/sign-in`, `/start`, `/outbox` and anything else | None of its own; the app calls the adults' routes |

`server/pages.ts` holds this table for page paths, and both the dev server and, in time, the Node server read it. Which app answers `/` turns on whether the children's view cookie, or failing that the session cookie, is there at all, under the one name the API reads for each in that mode (`__Host-ls_session` and `__Host-ls_kids` over HTTPS, so a cookie without the prefix that a subdomain planted does not count, and `ls_session` and `ls_kids` locally), which the router can see without opening the database; whether the session is live is the API's to say. Galleo checks its own cookie at this point, because a signed cookie can be checked with nothing but the key, whereas ours is a token looked up in `keys`, and routing a page is not worth a query. The API makes the cheap check honest: an adult route that refuses a session cookie clears it in the same answer, and a kid route does the same for a children's view's cookie, so a browser whose session has ended (signed out elsewhere, removed, swept, or a local database reset) lands once on the family's page, is told there that it is signed out and sent to `/sign-in`, and finds the site at `/` from then on. No stale cookie can keep a browser away from the site. Signing out goes to `/sign-in` rather than `/`, as galleo's logout goes to `/login`, since `/` is the site for a browser with no cookie.

What separate hosts gave, and what one origin keeps of it:

- A host-only session cookie was never sent with the child's app's requests. On one origin a cookie goes with every request to `/api`, so the separation is the route table's and the server's: the kid routes read only the children's view cookie, the adult routes read only the session cookie, and while a view is open on a browser the session it holds is put away and refused on every adult route. The children's build has no adult route in it, which `check:kids-build` checks.
- Storage was apart. On one origin both builds share IndexedDB and `localStorage`, where the children's view keeps only its queue of unsent answers and the grown-ups' app a hint that it signed in. Both are our own code with no third-party script, the content security policy allows scripts from our own origin only, and neither credential is in storage, since both cookies are HttpOnly. We accept that, and the privacy check holds the no-third-party rule.
- The passkey relying party id was `app.lumischool.ai`, so a passkey could only be used on the app host. It is now the one domain.
- Each path can still carry its own content security policy, since the server answers each route.

Render's Hobby plan includes two custom domains, so the domain and `www` cost nothing extra. In development one Vite dev server on port 8500 serves the same paths and passes `/api/` to the API on 8501, as [local.md](local.md) sets out.

## Who may do what

### Parents and tutors

There is no role column. What a membership may do follows from its row.

- A parent is a member with `kid_id` null, and no window. A parent has every right in the family. The database allows one parent row per person per family, so two parents are two people with a row each, and they are equal; it also refuses any change that would leave a family with no active parent, and auth checks first so that it can say why.
- A tutor is a member with a `kid_id`, a `from_day` and a `to_day`. A tutor reaches that one kid on the days from `from_day` to `to_day` inclusive, and nothing outside that. A person who tutors two kids in one family has two rows, one for each kid.
- A member with `ended_at` set, parent or tutor, has no rights at all. The row stays so that the family's record can still say who marked a sheet or opened a children's view.

An earlier version of this document proposed a third kind of member, a helper, who teaches every child but cannot manage people or delete anything. We now recommend nothing in its place. A second grown-up who shares the teaching is a parent, a tutor covers one child for a stretch, and the grandparent who takes a week is served by the handover pack in [parents.md](parents.md), which needs no login at all. If families ask for a seat between those, it would need a way to tell it apart from a parent in the `members` row, which the final schema does not have, and it is listed as an open decision with that trigger.

### Capabilities

The table is declared once, in `family/access.ts`, as a record typed over every capability, so a new capability cannot be added without saying who holds it. The server enforces it and the parent's app reads it to decide what to show, as flowmaestro's `ROLE_PERMISSIONS` is read by both of its sides.

| Capability | parent | tutor | Needs a fresh sign-in | Other parents emailed | Event recorded |
|---|---|---|---|---|---|
| See the family, its members and its children's views | yes | the family's name and their own rows | | | |
| Rename the family, or change its time zone | yes | | | | |
| Invite a parent or a tutor | yes | | yes | when accepted | `member-added` |
| Change a tutor's window | yes | | | | `member-changed` |
| Remove a tutor | yes | | | yes | `member-removed` |
| Remove the other parent | yes | | yes | yes | `member-removed` |
| Leave the family | yes, unless the last parent | yes | | yes | `member-removed` |
| Add a kid, with consent | yes | | | | `consent-given` |
| Change a kid's name, grade or settings | yes | | | | |
| Withdraw consent | yes | | | | `consent-withdrawn` |
| Delete a kid | yes | | yes | yes | `kid-deleted` |
| Open a children's view on this browser | yes | | | | `kid-session-opened` |
| End a children's view | yes | | | | `kid-session-ended` |
| Set the family's PIN | yes | | yes | | `pin-set` |
| Read a kid's record | yes | inside the window | | | |
| Mark, print, run a sitting | yes | inside the window | | | |
| Change the plan | yes | | | | |
| Author content, use AI generation | yes | | | | |
| Record a day of teaching | yes | | | | |
| Export the family | yes | | yes | | `exported` |
| Close the family | yes | | yes | yes, every member | none survives |

### What each caller may append, and read back

The event log is the one write path for a kid's record, so authorising most actions is authorising an append. The rule is a second complete record in `family/access.ts`, typed as `Record<EventKind, Access>`, so adding a kind to `engine/answer.ts` is a type error until somebody has decided who may write it and who may read it. That is the technique `engine/answer.ts` already uses to make its edge check complete.

| Event kind | A kid session writes it (the actor is null, the kid is the key's) | A person writes it (the actor is their user) | A kid session reads it back | A tutor reads it |
|---|---|---|---|---|
| `sitting-began`, `sitting-ended` | yes, for screen sittings | a parent or tutor, for paper sittings and sittings with a grown-up | yes | yes |
| `answered`, `hint-opened`, `round-played` | yes | no | yes | yes |
| `sheet-printed`, `marked`, `responded` | no | a parent or tutor | yes | yes |
| `plan-changed` | no | a parent | yes | yes |
| `world-chosen` | no | a parent | yes | no |
| `content-authored` | no | a parent | no | no |
| `content-verified` | no | no; the server writes it | no | no |
| `day-added` | no | a parent | no | no |
| The thirteen auth kinds, from `signed-in` to `exported` | no | no; the server writes them | no | no |

Three properties follow. A child's work only ever arrives under a kid session and a person's actions only ever arrive under their session, so neither can be written in the other's name. A kid session reads back its child's own work, sheets and plan, which is what a view needs to draw the child's pages, since it keeps no copy of the log, but never a parent's note on a day, the family's authoring history, anything about who signed in, or anything about another child, even one in the same view. And a tutor reads their one kid's record and nothing about the family's members, children's views or consent.

A tutor sees the family's own `content` only where their kid's plan uses it, which is worked out by the fold in code, because SQL never reads inside a payload. A question a parent wrote with a sibling's name in it is therefore not visible to a tutor who teaches the other child.

### The binding checked on every append

Before the store's edge check and `append`, the server checks each event against the caller.

Under a kid session: `family_id` is the view's family; `kid_id` is the child the path names, and the view must hold a key for that child; `actor` is null; `device` is that child's key id; and the kind is one a child may write (screen sittings, `answered`, `hint-opened` and `round-played`). The server stamps `actor`, `device` and `seq` itself whatever the draft says, taking `seq` in that key's stream under the family's lock, so a view sends drafts and never chooses its place in a stream.

Under a session: `family_id` is the session's family; `actor` is the session's user; `device` is the session key's id; `kid_id`, where there is one, is a kid this member may reach today in the family's time zone; and the kind is one their membership may write.

Nothing that arrives over HTTP may carry the server's own device stamp.

The rule about `device` keeps each stream to one writer. Without it, a tutor could append events under a child's key id, and the tutor's work and the child's would share one stream as if one writer made both. With it, each key's stream is written only by that key, and since the server numbers every stream under the family's lock, no write can claim a place another holds, and a clash is refused as an error rather than skipped.

As with the store's own validity rule, a batch is all or nothing: one event the caller may not write refuses the whole batch, with the reason and the event's place in it. A view's batch is always one child's, since it goes to one child's path under that child's key, so a withdrawn consent for one child never holds up another child's work in the same view, and the view drops the one refused event and sends the rest again.

A kid session is how consent is enforced after it is given. Opening a view makes keys only for kids with an active consent, and withdrawing consent deletes the kid's keys, after which nothing can be written for that kid from any view.

### The server's own events

The server writes some events itself: the thirteen auth kinds, in the same transaction as the action they record, and `content-verified`, when the verifier finishes. Since an event's `id` is made by its writer, the server makes these ids. They carry the user who caused them as `actor` (or null for a sweep or the verifier), the server's fixed device stamp, which no key can have, and a sequence number for that stamp in that family which the server takes while holding a lock on the family's row, so that two requests at the same moment can never share one and the server's own stream in each family has no gaps either. The store skips an event only when its `id` is already stored, which is what makes a view's resent chunk harmless, and these are never written with `on conflict do nothing`, since a silently skipped `consent-given` would be a missing proof of consent.

### Where the check happens

Every route is declared through one function, with the kind of caller it accepts and the capability it needs, and the Hono app is built from that table. Two middlewares run before every route, in flowmaestro's order: who is asking and in which family (the entry point described above), and then may they (the capability, with the fresh sign-in rule). A request for something the caller cannot see answers 404, as galleo does, and a request the caller can see but may not make answers 403. The route table is what the tests walk ("Tests and guards").

## The flows

Each flow gives the screens, the requests, what is written or checked in the store, what the caller holds afterwards, and what goes wrong and how it recovers. Requests are on the one domain; those under `/api/kid/` are the children's view's. "A definer function" means one of the security-definer functions listed in "Before a family is known"; every other read and write runs inside `withFamily`.

### 1. A parent signs up and starts a family

The marketing site's Start link opens `/start`. The first screen asks for the email address, the parent's own name, the family's name, and the time zone, which is detected from the browser and can be changed; a sentence says we will send a code. The second screen has a code field, the address shown above it, and "use a different address". The third is the empty family, with Add a kid as the only thing to do.

`POST /api/auth/email/start {email, start: {name, family, timeZone}}` normalises the address (trimmed and lowercased) and checks the limits. Whether or not a login exists for the address, it answers `202` and sets `__Host-ls_pending`, a random 32-byte value that lasts fifteen minutes. Through a definer function it writes a `sign-in` key with no family: `hash`, the SHA-256 of the pending cookie; the address; the login, if there is one; `ip`, a keyed hash of the caller's network; and `detail`, holding the HMAC of an eight-digit code under the server's `AUTH_PEPPER`, the SHA-256 of a 32-byte link token, and the three answers from the form. It sends the email. The response to the browser is the same whether or not the address has a login.

`POST /api/auth/email/verify {code}` finds the key by the pending cookie's hash, applies its ten-minute rule, counts the attempt, and compares the code. Then, in one `withFamily` transaction on a new family id, it uses the `sign-in` key, which deletes it; reads the login for the address again while holding a lock on the address, so that two codes for one new address used at the same moment make one login; writes the login under a new user id where there is none; makes the family and its first parent in the store's one call; writes the `session` key, deleting a session of the same person that the browser already held; and records `member-added` and `signed-in`. A step that fails undoes the rest, and the code is left. It sets the session cookie and clears the pending one.

Afterwards the store holds one login, one family, one parent, one session key and two events, and the code is gone. The browser holds a credential that names the new family, and the session carries the family, the user, and a `created_at` of now.

| What goes wrong | What happens |
|---|---|
| The code does not arrive | "Send it again" is allowed once a minute and three times in fifteen minutes. Each new code is a new key under a new pending cookie, and the previous key is deleted |
| Five wrong codes | That code is dead and the page asks for a new one. Ten wrong codes for one address in an hour stop codes for that address for the rest of the hour |
| The code runs out | The page says so and offers a new one. Ten minutes is short on purpose: the Auth Book allows up to an hour, and a parent at a table is usually holding their phone |
| The address already has a login | The code signs them in and the new family is made for that login, which is how a tutor starts a family of their own |
| Someone types another person's address | Nothing is created. The owner of the address receives a code they did not ask for, with a line saying they can ignore it |

We use eight digits because the Copenhagen Book asks for "at least 8 digits if the code is numeric", and digits because a phone shows a number pad for them. The code is stored as an HMAC under a key that is not in the database, rather than as a plain SHA-256, because eight digits is a hundred million possibilities and a leaked table of plain hashes of them could be reversed in seconds. The Auth Book's advice is a slow password hash for the same reason; a keyed hash answers the same threat at a fraction of the cost, since the key never sits beside the table.

### 2. Signing in

By email code, the two requests are the ones in flow 1 without the form's answers. What happens after the code is accepted depends on how many active families the login belongs to, which a definer function lists. With one, the session key is made there and the code deleted. With several, the response lists the families by name, and the key is marked verified and kept; `POST /api/auth/email/choose {family}`, inside the same ten minutes, makes the session in the family chosen and deletes the key. With none, which is a login whose memberships have all ended, the page offers to start a family, on the same terms.

The email carries the code and a link, `https://lumischool.ai/sign-in/link#t=<link token>`. The token is in the fragment, so it never reaches a server log or a `Referer` header. The link's page reads the fragment, removes it from the address bar, and shows "Sign in as n•••@example.com on this device?" with a button, so a mail scanner that fetches the page signs nobody in. Pressing the button sends `POST /api/auth/email/link {token}` with the pending cookie; the key is found by that cookie's hash and the token is compared with the link hash in its `detail`. Opened in any other browser there is no pending cookie, and the page says "Type the code on the device where you asked". A link that signed in whichever browser opened it would let someone sign a parent's browser into a login the parent does not own, and a parent who then added their kids would be adding them to a stranger's family.

By passkey, `POST /api/auth/passkey/options` returns options for a discoverable credential with a fresh challenge, and writes a `sign-in` key whose hash is the challenge's SHA-256 and whose `detail` names the browser's pending cookie. The sign-in page also asks the browser for conditional mediation, so a browser that knows a passkey for this site offers it from the email field. `POST /api/auth/passkey/verify` reads the challenge from the response's `clientDataJSON`, finds its key and checks the browser, finds the login by the response's user handle (a definer function, since no family is known yet), verifies the assertion with SimpleWebAuthn against the matching entry in `users.passkeys`, records the passkey's use and new counter on the login's own row, and then goes on exactly as the email code does, choosing a family if there are several. A passkey on a phone signs in on a shared computer through the platform's cross-device flow, in which that computer shows a QR and the phone's camera reads it; the operating system does that, not our code.

On a shared device, the sign-in page has "This is a shared device", already ticked when the page was opened from a children's view's Sign in instead, which goes to `/sign-in?shared=1`. The key is a `shared-session` rather than a `session`, a sign-out button stays in view, and the page does not offer to create a passkey. A sign-in on a browser that holds a children's view ends that view, as flow 7 says.

Afterwards the browser holds the session cookie, and the session carries the family, the user and when they proved themselves. `signed-in` records the method (`email-code`, `link` or `passkey`) and whether the device is shared. `/api/me` returns the person's name and address, their membership in this family, and the names of their other families for the switcher.

| What goes wrong | What happens |
|---|---|
| The link is opened in another browser | The page asks for the code instead |
| The link is opened after the code was used | The key is gone, and the page says the sign-in has already happened |
| A passkey whose login has no active families | The page offers to start a family |
| A passkey's counter goes backwards | SimpleWebAuthn refuses the assertion, and the parent signs in by code and is shown their passkeys. Synced passkeys report a counter of zero, which never goes backwards, so this arises only for a hardware key that may have been copied |

Outside production the code step also accepts a fixed code, `12345678` unless `AUTH_DEV_CODE` names another, beside the one we email, so that a developer, the seeded Harlows' parents and the end-to-end tests can sign in without reading the outbox. It stands in only for proving the address: the browser must still have asked for a code for that address in the last ten minutes, wrong guesses and the rate limits count as for any code, and the choice of family, consent and the `signed-in` event are unchanged. The server adds it to a code's accepted hashes only when it runs locally, and refuses to start anywhere else with `AUTH_DEV_CODE` set, because in production it would sign in anyone who typed it.

### 3. A second parent or a tutor joins

On the family's People page, a parent presses Invite, types an address, chooses Parent or Tutor (a tutor also gets a kid and a first and last day, flow 9), and confirms, which needs a fresh sign-in. The page lists pending invitations with a cancel button beside each.

`POST /api/members/invite {email, kid, fromDay, toDay}` writes an `invite` key in the parent's family: the inviting parent as `user_id`, the invited address, for a tutor the kid as `kid_id` and the days in `detail`, and the SHA-256 of a 32-byte secret. The email gives the family's name, whether it is an invitation to be a parent or a tutor, who invited them, and a link, `https://lumischool.ai/join#t=<family>.<key>.<secret>`. Because the link names its family, the invitation is read inside that family's transaction like any other credential, and needs no definer function.

The link's page shows "Join the Oakley family as a parent", then asks the person to sign in with the invited address, or create a login with it, using an ordinary code that carries the invitation's id in its `detail`. When that code is accepted, the server opens the invitation's family, checks that the invitation is inside its seven days and that its address is the one just proved, and in one transaction writes the login if there was none, writes the `members` row, or clears `ended_at` on the person's earlier row if they were a member before (which the one-row rule requires), deletes both keys, makes the session in that family, and records `member-added` and `signed-in`. A person already signed in to another family accepts with `POST /api/members/accept {token}`: the same checks against their login, the membership, and a session switched into the new family that keeps their existing `created_at`. Every parent is emailed who joined and as what.

The address check is the one galleo lacks and flowmaestro takes from a token claim rather than the database. It is what makes a forwarded invitation useless to the person it was forwarded to.

Afterwards the person's session is in the family they joined.

A parent removes a tutor from the People page, and removes the other parent there too, which needs a fresh sign-in. Removing sets `ended_at` on the membership and deletes the person's session keys in this family in one transaction, records `member-removed`, and emails the person removed and every parent. The row stays, so a sheet the person marked still says who marked it, and it grants nothing. The last active parent cannot be removed and cannot leave; the database refuses it and auth says so first. They can close the family, or invite another parent before leaving.

| What goes wrong | What happens |
|---|---|
| The invited address already has a login | Nothing different; accepting only needs a sign-in |
| The invitation has run out or been cancelled | The same message for both, and the parent can send another |
| The person signs in with a different address | "This invitation was sent to n•••@example.com" |
| The invitation is forwarded | The recipient cannot accept it without the invited address's codes |

### 4. A parent adds a kid

The screen and the consent are described in "A kid, and what a parent consents to". `POST /api/kids {name, grade, consent: {notice}}` writes the `kids` row and records `consent-given` in one transaction. The request is refused unless `consent.notice` names the current notice, so an app that has cached an old notice cannot record consent to it. The confirming email goes at once, to the parent who consented.

To withdraw, a parent signs in, opens the kid's page and presses Withdraw; the confirming email links there. `POST /api/kids/:kid/consent/withdraw` records `consent-withdrawn`, deletes every `kid-session` key for that kid, and records `kid-session-ended` with the reason `withdrawn` for each view that held one, in one transaction. The page then offers to delete what we hold, which is flow 12.

Afterwards the session is unchanged, and the family has one more kid, who can now be ticked when a children's view is opened.

| What goes wrong | What happens |
|---|---|
| The box is not ticked | The kid is not added, and the page says why consent is asked for |
| The notice changed while the page was open | Refused with the new notice, which the page shows |
| The confirming email bounces | The parent sees a banner asking them to check their address. Collection continues, since consent was given; the lawyer's list asks whether it should |
| A parent who cannot sign in wants to withdraw | They recover their sign-in first (flow 11), and the confirming email says where to write for help; meanwhile a second parent in the family can withdraw it |

### 5. A parent opens a child's view

On the family's page each child has "Open Rosie's view". Pressing it opens the view in one tap, and a line under the buttons says once what happens: opening a child's view puts the parent's sign-in away on this browser, and a grown-up comes back to the family's page with the family PIN, as they were, or by signing in again. `POST /api/kid-sessions {kids}` needs a parent's session and no fresh sign-in, because it leaves the browser able to reach less than it could. In one transaction it checks the kid's consent again, writes a `kid-session` key for the child with the parent as `user_id`, the browser's name, and a view id in `detail`, puts the parent's own session key away for that view, and records `kid-session-opened` and `session-changed` with the change `put-away`. The answer sets `__Host-ls_kids` with the new key's credential and leaves the session cookie as it is, and the page goes to `/kids`. Until 20 September 2026 the session key was deleted and its cookie cleared, and `signed-out` was recorded, so getting back cost the PIN and then a code; the owner chose to keep the key instead. The route still takes a list of children, and the page sends one; brothers and sisters join from inside the view (flow 6). Until 15 September 2026 the button said "on this device" and opened a card with the family's other children to tick; the owner decided that day that devices are not a user-facing thing, since a parent signs each child in on whichever device they have that day, and that which browsers hold a view is log and audit data.

When the family has no PIN yet, "The family PIN" on the same page says so and offers to set one, since without it a grown-up leaves the view only by signing in again. Setting the PIN is `POST /api/family/pin {pin}`, four digits, which needs a fresh sign-in, replaces any PIN before it, clears its wrong tries and records `pin-set`.

Afterwards the browser holds the view's cookie and the put-away session's, which reaches nothing until the PIN gives it back. The family's page does not list the browsers a view is open on. Every opening and ending stays in the log as it was (`kid-session-opened` and `kid-session-ended`, with the browser's name, who opened it and `seen_at` on the keys), `GET /api/kid-sessions` still answers the open views to a parent's session for a later surface to read, and nothing in the apps lists them. Under "The family PIN" one button, "End every open view", calls `POST /api/kid-sessions/end-all`, which deletes every view's keys in the family, and with them the sessions put away for those views on their browsers, since nothing could give them back, and records `kid-session-ended` per view with the reason `ended` and `session-changed` with the change `ended` per session, and answers how many views it ended. `POST /api/kid-sessions/end {view}` ends one view the same way. A browser that held a view gets `401 no-kid-session` on its next request, which clears its cookie, and it shows the card that asks for a grown-up; its put-away session's cookie is cleared by the first adult route it reaches, as any dead session's is.

| What goes wrong | What happens |
|---|---|
| A ticked child's consent was withdrawn while the card was open | Refused with `409 no-consent`, naming the child; nothing is written and the parent stays signed in |
| A ticked child was deleted meanwhile | Refused with `404 not-found`, and nothing is written |
| A tutor tries to open a view | There is no button for a tutor, and the server refuses it with `403 not-allowed` |
| The answer never arrives | The parent's session was put away with the transaction, so the browser's next request is refused and sent to `/kids`, which asks for a grown-up; the view is listed on the family's page, where a parent ends it, and the PIN on that browser gives the session back meanwhile |

### 6. Several children in one view

A browser with no view that opens `/kids` sees a card that asks for a grown-up, with Sign in. A view opens for one child and goes straight to that child's page. A grown-up adds a brother or sister from inside the view (15 September 2026): holding the Grown-ups tab (flow 7), typing the family PIN, and pressing the child's name calls `POST /api/kid/add {pin, kid}`, which checks the PIN exactly as leaving does, with the same waits and count of wrong tries, and then, in the same transaction, makes a `kid-session` key for that child in the same view under the parent who opened it, records `kid-session-opened` with that key, and answers the view's cookie again with the new credential added to the ones the browser sent. `GET /api/kid` answers `others`, the id and name of each of the family's other children with an active consent, so the card can offer them, and a child cannot add a sibling without the PIN. A view that holds several children opens on "Who is learning today?", with a picture and a name for each child it holds a key for, large enough for a five-year-old's finger. Switching child is choosing which of the view's keys the page uses: `GET /api/kid` returns the view's children and whether the family has a PIN, and `GET /api/kid/:kid/state` returns one child's row, the kinds of their log a child reads back, and the tutors whose window is open today. Which child is open is kept in memory only, so a reload opens on the pictures again.

There is no picture key, so a sibling can tap another child's picture and open their page, which the owner accepted. A picture key on a shared screen keeps out only a child who has not watched it being entered, and it would be one more thing for a five-year-old to remember. What still holds is that each request names one child and goes under that child's key, so a mistake in the page cannot mix two children's records in one request, and the server refuses a request for a child the view holds no key for.

What a child cannot reach is the parent's side. It is not in the children's build: the children's client, `engine/ui/kid.ts`, names only kid routes, `check:kids-build` walks the built chunks for any `/api/` path outside `/api/kid/`, and the kid routes read only the view's cookie. The answers are the one thing the page must hold, because grading screen work happens in the page from the pack; they are never shown, and a child with developer tools could find them, which on a device a parent handed over is a risk we accept.

What we cannot know is which child was holding the device. Work arrives under the key of the child whose page was open. The parent's side should not claim more than that, which is the same honesty [parents.md](parents.md) asks for about time on task.

### 7. Leaving a children's view

In a corner of every screen in the view there is a small Grown-ups tab. Pressing it does nothing. Holding it for two seconds opens a card with the family's PIN in four boxes, Leave the children's view, the family's other children to add to the view (flow 6), and Sign in instead. Nothing on the device checks the PIN or keeps it.

`POST /api/kid/leave {pin}` checks the PIN against the family's `pin` key, which it locks for the length of the transaction, so two tries at once are counted in turn. After five wrong tries in a row, each try waits a minute from the last wrong one, and after ten it waits fifteen minutes; a try that comes too soon is `429 rate-limited` with `retryAfter`. A wrong PIN is `400 wrong-pin` with `attemptsLeft`. After fifteen wrong tries in a row the PIN stops working, answered as `409 no-pin`, until a parent signs in and sets it again, and a family with no PIN gets the same answer. A right PIN clears the count and, in one transaction, deletes the view's keys and gives back the session this browser held when the view opened: the session cookie the request carries must name a live key put away for this very view, with its secret matching, and the mark comes off it. It is marked as the PIN's from then on, so it is never fresh. `kid-session-ended` with the reason `pin` and `session-changed` with the change `restored` are recorded, the answer clears the view's cookie and sends the session cookie again with its age from now, and the page goes to the family's page, where the parent is as they were. When there is no such key, because the session ran out while it was put away or the view's cookie was copied to a browser that never held it, the PIN makes a `shared-session` key for the parent who opened the view, marked as the PIN's, and records `signed-in` with the method `pin`, as it did before 20 September 2026; any other session put away for the view goes, recorded `session-changed` with the change `ended`. If the parent who opened the view is no longer an active parent, a right PIN is refused with `403 not-allowed`, the view stays, and a grown-up signs in instead.

The session the PIN gives back, restored or made, is never fresh, whatever its `created_at`, since a four-digit PIN says nothing about who typed it. A watched PIN therefore reaches the family's page, and a restored session keeps its own thirty days, but it cannot set the PIN, invite anyone, export or delete, however new the sign-in it came from. Before it asks the server, the view sends everything in its queue, and it refuses to leave while anything is still waiting, so leaving never loses an answer.

Sign in instead opens `/sign-in?shared=1`, with "This is a shared device" ticked. When a sign-in completes on a browser that holds a view's cookie, the server reads the cookie only to end the view, deletes its keys, records `kid-session-ended` with the reason `sign-in`, and clears it, so a forgotten PIN never traps a device; the session put away for the view is replaced, as any session the browser held is by a sign-in. A forgotten PIN is then replaced from the family's page.

We considered three other ways out and rejected each for one reason. An arithmetic question is the usual gate in children's apps, and it is useless in a maths product whose children can multiply. A PIN kept on the device, as the earlier tablet's gate was, can be read or reset by anyone holding the device, and its wrong tries cannot be counted anywhere a child cannot clear. And a full sign-in every time means an adult credential typed in front of children many times a day, which Sign in instead still offers when it is wanted.

### 8. A short loss of connection

The view is online first. A child's answers go into a queue in IndexedDB as they are made (`engine/ui/kid.ts`) and are sent at once, in chunks of at most fifty events and 512 KB, oldest first for each child, to `POST /api/kid/:kid/events`; the server takes at most fifty events and 1 MB in one request. The server checks the view's key for that child, applies the binding above and the store's edge check, stamps each event, and answers with the ids it has stored, which the view takes out of its queue. A chunk sent twice is written once, because `id` is the writer's.

When the network goes, the view keeps recording and says "No internet just now. Your answers wait here until it comes back." It tries again after two seconds, doubling the wait up to a minute, and at once when the browser says it is online again; a `429` or a server error waits the same way. An event the API refuses by rule is dropped, since sending it again would be refused again, and the rest of its chunk and the chunks behind it carry on. An event over 256 KB is refused when it is recorded, and nothing of it is kept.

A `401 no-kid-session` means the view has ended, by a parent, a sign-in or the lifetime rule. The view clears its queue, says so, and shows the card that asks for a grown-up. Nothing is accepted under a view's keys after it has ended, however it arrives.

This covers minutes, not days. What the queue holds is lost if a parent ends the view while that device is offline, which the owner accepted, and anything the page needs to read that it has not read yet waits for the network, since the view keeps no copy of the log.

| What goes wrong | What happens |
|---|---|
| A chunk is too large | The view never sends one past the limits, and the server refuses one that is with `too-large` |
| One event is malformed | The whole request is refused with the reason and the event's place; the view drops that event and sends the rest again |
| One child's consent was withdrawn | That child's keys are gone, so their requests are refused, and the other children in the view carry on |
| The view ran out while the device was offline | The next request gets `401`, and the queue is cleared |

### 9. A tutor's window onto one kid

From the kid's page, a parent presses "Give a tutor access", types the tutor's address, and sets the first and last day, which needs a fresh sign-in. The page says what the tutor will see: this kid's lessons and work, including what came before the window, and nothing about the other kids or the family's records.

The invitation is flow 3's `invite` key with the kid in `kid_id` and the days in `detail`. Accepting it writes a `members` row with that `kid_id`, `from_day` and `to_day`, and records `member-added` with the same facts. A tutor who already teaches another family signs in with the same login and has a row in each family, and chooses which family to work in at sign-in or from the switcher. A tutor who teaches two kids in one family has two rows.

What the tutor may do is the capability table and the event table above, reached through the entry point, which works out on every request which kids the member may reach today in the family's time zone. Both ends of the window are inclusive days. A parent extends a window or ends it early by changing `to_day`, which records `member-changed`. After the last day the tutor's session in that family still exists but reaches nothing, and thirty days after the last day a sweep sets `ended_at` on the tutor's row, deletes their session keys in that family, and records `member-removed`, so that a tutor's list of families does not fill with families they no longer teach, while the family's record still says which tutor marked what.

The tutor is emailed when access is granted, when the window changes and when it ends. A tutor cannot see the family's other members' addresses. A tutor's marks carry the tutor's user as their actor. Anything a tutor wrote offline and sent after the window closed is refused, because the check is made when it arrives.

Whether a tutor sees the kid's whole record or only what happened from the first day of the window is an open decision. We recommend the whole record of that one kid, because the gap ledger a tutor needs is computed from it, and the invitation page says so before the parent sends it.

Afterwards the tutor's session is in the family, and reaches the one kid only on the days of the window.

### 10. Signing out, and signing out everywhere

The account page (`/account`, from the menu under the grown-up's own stamp on the bar) lists the person's session keys in this family with `GET /api/sessions`: each key's name, when it was made and last used, whether it is a shared-device session, whether it was given by the PIN, and whether it is put away for a children's view, with this browser's own marked and never a hash. Sign out beside each calls `POST /api/sessions/end {id}`, which ends one of the person's own keys and records `signed-out`, clearing the cookie when it was this browser's; Sign out everywhere below calls `POST /api/auth/sign-out {everywhere: true}`. Built on 21 September 2026 with the account page, which also holds the family PIN, the children's views open in the family with End beside each, the person's other families with Switch, the notice's promise about the family's data (export and deletion wait on their routes, flow 12), and what paying for lumischool is, which is nothing yet. Passkeys are listed from `users.passkeys`, each with a name the person can change and a Remove button. Ending a session deletes its key, and the next request from that browser gets `401` and lands on the sign-in page. None of this ends a children's view, which the family's page lists with its own End, because a parent signing out everywhere after losing a phone does not want the children's views closed.

### 11. Recovery

A parent who has lost a phone signs in elsewhere with a passkey, which the platform will usually have synced to their other devices, or with an email code, then ends the phone's session from the session list and removes its passkey if it held one that did not sync.

A parent who has lost access to their email changes the address if they are still signed in somewhere or have a passkey. The new address gets a `confirm` key's code; when it comes back inside ten minutes, the person's own `users` row takes the new address, the key is deleted, the old address is told, the person's other sessions end in every family, and each of their active families records `login-changed`. If they have neither, and another parent is in the family, that parent invites them again at a new address, which creates a second login, and then removes the old one's membership. If there is no other parent either, we cannot tell the parent from someone claiming to be them, since we hold no other fact about them, and we should say so rather than invent a support procedure that an impostor could pass. The children's views keep working throughout, because a kid session does not depend on anyone's email. The product's defence is to say this once, plainly, when the family is started, and to offer the two remedies: add a passkey, and invite a second parent. A second address on a login would be a third remedy, and is an open decision.

A lost or stolen device that held a children's view is ended from the family's page (flow 5), and its next request finds nothing. The device kept no copy of the log, so nothing of the children's is left on it but answers still waiting to be sent, and those are lost. A view opened on another browser reads each child's record from the family's log, so their pages return with everything that had been sent.

If passwords ever ship, a forgotten password is a code to the address, a new password, and every session ended.

### 12. Deleting a kid, closing a family, exporting

To delete a kid, a parent presses Delete on the kid's page, which needs a fresh sign-in. The page first offers the export, because [parents.md](parents.md) says a family may be legally required to hold what we are about to destroy, then asks the parent to type the kid's name. One transaction deletes the `kids` row, which through the `(family_id, kid_id)` foreign keys removes the kid's events, any tutor's membership for them, any pending tutor invitation for them and their keys in any children's view; deletes the session keys of a tutor left with no active row in the family; and records `kid-deleted` with the kid's id and no name. The `consent-given` and `consent-withdrawn` events stay, since they are recorded against the family, and they hold the kid's id and the notice and nothing that names the child. Every other parent is emailed that a kid was removed and by whom, without the name. Nothing is kept of the kid themselves: there is no soft delete and no recovery window, which is what `privacy.ts` promises.

To close a family, a parent presses Close in settings, which needs a fresh sign-in; the export is offered first, and the parent types the family's name. Deleting the `families` row removes everything the family holds: its members, kids, keys, content and the whole of its log, including every consent record and the `signed-in` and `kid-session-opened` history. Nothing records who closed it except the email every member receives at that moment. A login is not part of a family and survives. A person can close their login from the account page once they are an active member of no family: the store's policy lets a person delete their own `users` row, and the ended memberships that still point at it go with it, after which the families they were in read the person's name from their `member-added` events. A person who is the last active parent of a family must close that family, or invite another parent, first; the database refuses otherwise.

We recommend that closing deletes immediately, and that the retention window [parents.md](parents.md) promises be the time our backups take to expire, which on Neon is the history window of the plan we choose. That needs no closure record and no sweep, and it describes accurately where the data still is. The window must be written into the retention policy as a number once the plan is chosen; we have not looked up Neon's current windows for this document.

When two parents disagree, either may delete a kid or close the family alone, since the owner has settled that two parents have identical rights. What the design does is make it visible: the action needs a fresh sign-in, every other parent is emailed at the moment it happens with the name of the parent who did it, and a kid's deletion is recorded as `kid-deleted`. A closed family has no log left to record it in. This is on the lawyer's list.

A family nobody uses needs a rule too. The amended COPPA rule forbids keeping a child's information indefinitely, and "while the account is open" has no end if a family simply stops coming. We recommend that a family be warned by email at 17 months without use and deleted at 18. The final schema has no column for when a family was last used, and it does not need one: the time is the later of the family's most recent `signed-in` event and the most recent `seen_at` among its keys, both written by our own clock, and a parent who uses the product signs in at least every 90 days because no session lasts longer. The two numbers are the owner's to set.

To export, a parent presses Export in settings, which needs a fresh sign-in and is limited to five a day. `GET /api/export` streams one JSON download: the family, its members (active and ended) with each person's name and address, its kids with their settings, its session keys and children's views by name, kid and last use, every event including the auth kinds, and the family's content. It leaves out every `hash`, the passkeys' public keys, and any pending codes, which are ours rather than the family's. It records `exported`. The household folder of notation files joins it when `record/household.ts` exists. It is never emailed, because an attachment would put the kids' records at the email provider.

What goes wrong in these three is limited by each being one transaction. A parent who declines the export still deletes, because the export is offered rather than required. A deletion that fails part way rolls back whole. A children's view that is offline when the kid is deleted loses the answers it was still holding for them, since their keys went with the kid. An export that fails part way leaves nothing behind on our side, since it is streamed and never stored.

### 13. The marketing site

The site is `apps/site`, at `/` for a browser with no session cookie and at `/home` for everyone ("Hosts"). It has no forms and no analytics, and it will be prerendered (step 7 of [structure.md](structure.md), "The order from here"). Its Sign in and Start a family links go to the grown-ups' app's `/sign-in` and `/start`, which are the first place a login can exist, and the logo on the grown-ups' screens goes to `/home`, so a parent who is signed in can always open the site.

The site asks `/api/me` once, in one signal its bar reads, as galleo's marketing header does, so that a parent who is signed in sees one way back to the family's page instead of Sign in and Start a family. This section first ruled that check out, because it is a request that says something about the visitor. It is asked only when this browser has signed in before, from the hint `engine/ui/api.ts` keeps, so a visitor who never has sends nothing, and the request goes to our own origin carrying the cookie and nothing more. The placeholder on the scratchpad's site pages, "a way to leave an email address", which the app's site leaves out, should become a `mailto:` link rather than a form, so that nothing on the site collects anything; that is the owner's call and is in the open decisions. A test should build the site and fail if the output contains a `<form>`, a `Set-Cookie`, a request to any path but `/api/me`, or any host other than our own.

### 14. AI

Every generation request is a person's request: a session, an active parent membership, and the capability to author. The family the cost is charged to is the session's family, never a value in the request body, so a parent who belongs to two families spends the budget of the family they are signed in to. The monthly budget per family and the cap a parent can see are [ai.md](ai.md)'s to set; this design gives them their key. Tutors cannot generate. A generation request changes nothing in the session.

A children's view cannot reach generation, and that is a matter of structure rather than of a check. The children's build calls no route outside `/api/kid/`, which `check:kids-build` checks, the kid routes call nothing that calls a model, the children's build's content security policy allows connections only to its own origin, and a test sends a children's view cookie to every route in the table and asserts that only the kid routes accept it. That is [ai.md](ai.md)'s tier one, "No model is reachable from a child's device, online or offline", held by the route table as well as by the build.

## Magic links

Status: a proposal, waiting on the owner's decision. The owner asked whether magic links would make
signing in easier for parents and for kids, on the belief that a link is the easiest way to sign in.
Nothing above changes until the owner decides; where the recommendation below would change a flow,
the change is described in this section and not yet made in the flow.

Our answer, in short: a link is the easiest way in on one path, when a parent asks on a device and
opens the email in the same browser on that same device, and it fails on three paths this product's
families will often be on. A code works on every path. So we recommend keeping the code as the
credential, and letting the link be a second way of presenting that same code, which is a small
change to what flow 2 already does. We recommend no other magic links, and none for children, who
already have something easier than any link: a parent opens their view, and they tap a picture.

### What we already send

Every sign-in email in this design already carries a link as well as the code (flow 2). The link
completes sign-in only in the browser that asked for it, through the `__Host-ls_pending` cookie, and
only after a button press on the page it opens, so that a scanner fetching it signs nobody in. The
question is therefore not whether to have links, but whether links should become the main way in,
whether they should work in any browser, and whether they should reach the flows that use codes
today, or the children, who have no email at all.

### Where a link is easier, and where it is not

A link beats a code on one path: the parent asks for a sign-in on a device, opens the email on that
same device, and the mail app hands the link to the same browser that asked. Then signing in is one
tap instead of reading eight digits and typing them; Okta, which offers both, says as much: "A user
has a better sign-in experience from magic links than OTP if they sign in from the same browser on
the same device." Even there the gap is narrower than it was. Since iOS 17, Safari offers "One-time
verification code AutoFill from Mail" (Apple), and a code field marked
`autocomplete="one-time-code"` is where it offers it. We have not confirmed that the offer reaches a
Home Screen web app, since Apple says only "in Safari", nor found anything equivalent for codes that
arrive in Gmail or on Android, where Chrome's own code API reads text messages only.

It fails, or needs a fallback, on these paths:

- The parent's app installed on an iPhone or iPad home screen. A web app on the home screen cannot
  capture links ("It's impossible to capture URLs on PWAs installed on iOS and iPadOS from Safari",
  web.dev, 2022), so a link from Mail opens in Safari; and it keeps its own storage apart from
  Safari's ("Web applications added to the home screen are not part of Safari", WebKit, March 2020).
  A link therefore signs Safari in, not the app the parent is using, and they come back to the app
  still signed out. Since iOS 26, "every website added to the Home Screen opens as a web app" by
  default (WebKit, September 2025), so this is the ordinary case for any parent who adds the app at
  all.
- Asking on one device and reading the email on another. A parent signing in on a shared computer,
  or on a laptop, very often reads their email on their phone. The link opens on the phone, which
  did not ask.
- Mail apps that open links in their own browser. Since iOS 11, Safari View Controller keeps "a
  separate persistent data store in each app" (Apple, WWDC 2017, session 225), so the browser that
  opens the link does not hold the pending cookie, even on the same device. Android's Custom Tabs
  share Chrome's cookies, so there this case is milder.
- Mail that passes through a security scanner. Microsoft's Safe Links scans URLs "prior to message
  delivery" and detonates unfamiliar ones "asynchronously in the background" (Microsoft Learn, May
  2026), and it is on by default for the consumer Outlook.com, Hotmail and Live addresses of
  Microsoft 365 Family and Personal subscribers, so it reaches families and not only workplaces.
  Supabase, Resend and Stytch all document scanners spending single-use links, and reports in the
  NextAuth and FusionAuth projects describe scanners that send a HEAD, others that send a GET, and
  some that run the page's scripts. A single-use link that is spent on a GET is gone before the
  parent sees it.

We expect all four to be common for our families, though we have not measured how common. A code
survives all four, because the parent carries it to the device that asked with their eyes rather
than through a browser. That is why the Auth Book prefers codes ("Binding the code to a session
links the verification attempt to the device that initiated it"), and why the Copenhagen Book adds
that a link "may introduce friction if the user wants to finish the process on a device that does
not have access to the verification message". It is also where the products that popularised links
have gone. Slack's help page told people to "Tap Email me a magic link" in 2019 and to enter "a
confirmation code" by 2021. Notion signs in with "a verification code". Medium, which introduced
sign-in links in 2015, now offers "a code instead" and says a link must be opened "from the same
device you requested it". Linear sends a link and a code in the same email, and Okta disables a link
opened in a different browser or device and falls back to the code. Galleo, on this machine, made
the same move in August 2026 ("What the siblings do").

The way to make signing in easier than a code is not a link. It is a passkey, which on the parent's
own phone is one touch with no email at all, and on another device is a QR the phone's camera reads,
and which cannot be phished the way an emailed link or code can. Passkeys are the next step in the
order of work already.

### One credential, two ways to present it

We propose that the email carry one secret, the eight-digit code, and show it twice: as text, and
inside the link, `https://lumischool.ai/sign-in#c=48207316`. Pressing the link opens a page that
reads the code from the fragment and removes it from the address bar. In the browser that asked, the
page says "Sign in as n•••@example.com?" and its button sends the code with the pending cookie,
which is the same request as typing it. In any other browser there is no pending cookie, so the page
cannot sign anyone in; it shows the code in large digits with "Type this on the device where you
asked". The failure on the second and third paths above then becomes the easy path: the parent reads
the code off the phone's screen instead of hunting for it in the email.

What changes from flow 2 is small. The separate 32-byte link token and its hash in the `sign-in`
key's `detail` go, and the link carries the code instead. The key, its kind, its ten-minute rule,
its five attempts, its binding to the pending cookie and its deletion when it is used are all
unchanged, and whichever presentation the parent uses first deletes the key, so the other stops
working. It needs no new table, no new column and no new kind; `detail` holds one field fewer. The
store's `key_guess` already checks a guess against a list of accepted hashes in `detail`, so the
list simply has one entry. The `confirm` code for a new address (flow 11) takes the same shape,
which means the store should find a `confirm` key the way it finds a `sign-in` key, by the hash of
the pending cookie and with its wrong guesses counted, rather than by the code's hash alone through
`key_take`; found by the code alone, a short code is a guess against every live `confirm` key at
once, and a hit would use up someone else's.

It exposes nothing new. OWASP asks that verification tokens and full verification URLs never be
logged, and RFC 6750 that bearer tokens not be passed in page URLs; the code in this link is not a
bearer token, since it does nothing without the pending cookie. The link carries only what the
email's text already shows, so a scanner that reads the email learns nothing it could not read
before, and neither the code nor the link does anything without the pending cookie of the browser
that asked. The code is in the fragment, so it never reaches a server log or a `Referer` header; the
page sets `Referrer-Policy: no-referrer` as well, and replaces its own history entry so the code is
not left in the browser's history.

One caution runs the other way. The Copenhagen Book notes that "some filters may automatically
classify emails with links as spam or phishing". We have not measured that for our own sender. If it
proves true, the link can be dropped and nothing else changes, since the code alone works on every
path.

### Flow by flow

| Flow | What a link would do better | What a link would do worse | Recommendation |
|---|---|---|---|
| Parent sign-in (flow 2) | One tap, when the email is opened in the browser that asked | Signs Safari in rather than a home-screen app; fails across devices and in mail apps' own browsers; survives a scanner only because its page needs a button press | The code, with the link as a second way to present it |
| Sign-up with consent (flows 1 and 4) | The same as sign-in, for proving the address. A consent link in an email could put the consent itself in the email, which is the textbook shape of email plus | Moves consent away from the screen where the parent reads the notice beside the form, and delays opening a children's view until the email is opened | The address as in sign-in; consent stays in the app; the lawyer's question 1 now also asks whether a click in the email would be the stronger form |
| A second parent's invitation (flow 3) | Accepting from the invitation link alone would save the invitee one email | The invitation lives seven days and nobody asked for it, so it cannot be bound to a browser; accepting on the link alone is possession-based acceptance, which is galleo's flaw, for a seat with every right over the kids' records | Keep the invitation link, and keep proving the address with the sign-in code or its link |
| A tutor's invitation (flow 9) | The same | The same, for a seat that reaches one child's record | Keep as it is |
| Changing the address (flow 11) | The owner of the new mailbox can confirm from any device | Nothing, since the change applies to the session that asked; but nothing is gained over the code either | The `confirm` code, with the same code-in-link shape |
| Signing in on a new device | Nothing | The worst case for a link: the email is almost always read on another device | The code, or a passkey by QR |
| Withdrawing consent (flow 4) | One tap from the confirming email, weeks later, with no sign-in | Needs a secret that lasts weeks in an inbox, which the ten-minute `confirm` rule does not allow and which would need an eighth kind; if forwarded, or pressed by a scanner that clicks, it would close a kid's views and lose what they had not sent | Keep signing in to withdraw, with the email linking to the page; a `withdraw` kind with a thirty-day rule is the owner's call, and we recommend against it |

### Failure modes, and what we would do about each

Scanners and link previewers. The common fix, which Supabase and Resend both give, is a page with a
button: "The domain can present the user with a \"Sign-in\" button" (Resend). That is what flow 2
already does. The link's page does nothing on a GET beyond rendering itself, the sign-in happens
only on the button's POST, and that POST needs the pending cookie, which a scanner never has, so
even a scanner that renders the page and presses its button signs nobody in and spends nothing:
without the cookie its request finds no key, so no attempt is counted either. A link preview in a
messaging app is a GET as well, and the same holds.

A link opened on a different device. The page shows the code to type on the device that asked. We
considered and reject the other common answer, a link that approves the sign-in waiting on the other
device ("Is this you, signing in on an iPad? Approve"). Clerk's documentation describes what goes
wrong without a same-device check: "the user's email provider follows links in emails for phishing
or spam protection. The malicious actor is able to gain access to the user's account", and Clerk
turns the check on by default. Anyone can type a parent's address on their own device and cause that
email to be sent, so an approve button in it is exactly what a parent might press without thinking.
Microsoft now requires number matching on every Authenticator push in place of a plain Approve
button, and keeps a bare yes or no only where "the prompt only shows on the device that initiated
the sign in" (Microsoft Learn, updated February 2026), which is the same lesson.

In-app browsers in mail apps. The in-app browser does not hold the pending cookie, so the page shows
the code, and the parent types it where they asked.

Opening in the wrong app. Sign-in links only ever point at the grown-ups' app's `/sign-in`. The
children's view under `/kids` has no sign-in screen, and a sign-in link there would open the
grown-ups' app. A parent who opens the email on a device that holds a children's view and signs in
there ends that view, as flow 7 says, since a browser never holds a view and a session at once.

Lifetime, replay and forwarding. Ten minutes, the `sign-in` rule; deleted when used, so a second use
finds nothing; bound to the pending cookie, so a forwarded link or code does nothing for whoever
receives it. An invitation's link is forwardable for its seven days, which is why accepting one
still needs the invited address proved again.

COPPA's consent. Email plus is about the channel: the parent's consent is tied to their email
address, and a link and a code prove control of that address equally. Neither the rule nor the FTC's
FAQ mentions links. What the FAQ does describe is the shape: the operator may "request (in the
direct notice sent to the parent's online contact address) that the parent indicate consent in a
return message", followed by a confirming step (FAQ I.4). This design has the parent consent in the
app, beside the notice, after proving the address, which is a variation on that shape. A button in
the notice email, or a reply to it, would be nearer the FAQ's wording and further from the form the
parent is filling in, and question 1 for the lawyer now asks which is the stronger form.

### For children

A child has no email, so a magic link for a child can only mean a link that opens a child's view on
some device. We looked at it and recommend against it. It would be a copy of a child's key in a URL,
which lives in browser history and message threads and opens on any device that has it, including a
friend's phone, and it would open a view without a parent signed in on that browser. What we have
already needs no link: a parent signed in on the device opens the view there, and the child taps
their picture.

So for children we recommend no magic links.

### What the siblings do

None of the projects on this machine signs anyone in with an emailed link, and the two that tried
links for confirming an address show both ways it goes wrong.

Galleo used a link to confirm a new account, `GET /auth/verify?token=` with a 24-hour token spent on
the GET, until commit `c7cb970` on 23 August 2026 replaced it with a six-digit code, "so confirming
happens in the tab the person is already in" (`.docs/onboarding.md:138-146`). Its invitations and
resets are still links, and each one lands on a page whose button sends a POST, so nothing is spent
by a GET.

Sourcewell went the other way. Its confirmation and invitation links sign the person in on the GET,
and after Defender Safe Links and Proofpoint fetched them first and spent them, it made them
reusable until they expire, 24 hours for a confirmation and 7 days for an invitation
(`backend/app/services/workspace/auth.py:507-517, 577-583`, with tests asserting that a link
survives a scanner's fetch at `tests/test_email_verification.py:75-93`). That fixed the scanner and
made each link a bearer credential that signs in whoever holds it for days, the scanner included.

Flowmaestro and llamatrade confirm addresses with links whose pages call the API as soon as they
load (`frontend/src/pages/VerifyEmail.tsx:15-26` and
`apps/web/src/pages/auth/VerifyEmailPage.tsx:14-26`), which a scanner that runs scripts spends as
surely as a GET. Flowmaestro also sends its query-string tokens to PostHog with every page view
(`frontend/src/lib/analytics.ts:43-49`). Clientbridge emails its tokens as text to be pasted, with
no link. The two other codebases on this machine that email anything to confirm a person,
beautifulai and PocketSuite, send codes.

What we take from them is galleo's conclusion, arrived at the same month by the same owner: a code
typed where it was asked for avoids scanners, second devices and in-app browsers at once. And what
we avoid is sourcewell's fix, which buys a link's survival by making it something a scanner can sign
in with.

### Recommendation

- Codes stay the credential for every flow that sends one, and passkeys remain the way to make
  signing in easier than a code.
- Sign-in and address-change emails carry one credential presented two ways: the code as text, and
  the same code inside the link, which signs in only in the browser that asked and shows the code
  anywhere else.
- Invitations stay links, and accepting one still proves the invited address with that sign-in
  credential.
- No withdrawal link, unless the owner wants an eighth kind with a long rule; we recommend against it.
- No approval-by-link between devices.
- No magic links for children; a parent opens a child's view on the device itself.

If the owner approves, flow 2 and flow 11 change as described under "One credential, two ways to
present it", the `sign-in` and `confirm` rows in the `keys` table lose the link token's hash, and
three tests join `server/auth.itest.ts`: a link opened in another browser shows its code and signs
nobody in; a scanner that loads the link and presses its button signs nobody in and uses nothing;
and a sign-in link never opens the children's view under `/kids`.

## What the child is told

The UK code asks for "an obvious sign to the child when they are being monitored", and the Canadian commissioners' resolution asks organisations to "make any monitoring or tracking obvious to the young person". The children's view showed such a sign on "Who is learning today?" and at the foot of each child's page, "Your grown-ups can see your pages.", with a tutor's name and the end of their window while one was open. The owner removed it on 14 September 2026, so no child-facing screen now tells a child who can see their pages. That reopens both requirements: the parent's side is monitoring in the ICO code's sense, and the children's view gives the child no sign of it. Whether a sign is needed, and what it should say, is question 13 on the lawyer's list, and the owner will decide once it is answered.

## Threats, and what stops each

| Who | What they try | What stops it | What remains |
|---|---|---|---|
| Another family | Reading or writing this family's data | Every request's work runs in the family its credential names, set before any query; row-level security under a role that cannot bypass it; `(family_id, kid_id)` foreign keys; a credential that names another family finds no key | A bug in a security-definer function, which is why there are few of them and each returns only what one step needs |
| A tutor or parent in two families | Carrying one family's data into the other | One browser is in one family at a time; switching replaces the session key; nothing in auth reads a table outside `withFamily` | |
| A curious sibling | Opening the other child's page | Nothing, in a view opened for both, which the owner accepted; a view opened for one child holds no key for the other | That child's own work, which a sibling beside them could see anyway |
| A curious sibling | Reaching the parent's side, the answers or the plan | Not in the children's build, which `check:kids-build` checks; a kid session is refused on every adult route; leaving needs the family's PIN, checked and counted on the server | A watched PIN, which gives a shared session that is never fresh, so it cannot set the PIN, invite, export or delete |
| A curious sibling | Doing the other child's work | Nothing, in a view opened for both | We cannot tell who held the device, and say so |
| Whoever finds a lost device | Reading the children's work on it | The device's own lock screen; a parent ends the view from the family's page; the device keeps no copy of the log | What the page showed while the view was still open |
| Whoever finds a lost device | Sending made-up work | Nothing is accepted under a view's keys once a parent has ended it | Anything sent between the loss and ending the view |
| A former co-parent | Reading the kids' records after leaving | The other parent removes them, with a fresh sign-in, which ends their membership and deletes their session keys in the family; everyone is emailed | Whatever they exported before |
| A former co-parent | Deleting a kid or closing the family | A fresh sign-in; every other parent is emailed at once; a deletion is recorded | Two parents have equal rights, which the owner has settled; the lawyer's list asks what the law expects |
| A former co-parent | Keeping a children's view open at their home | The family's page lists every open view with who opened it, and a parent ends it | |
| Someone with a stolen session | Reading and changing the family | HttpOnly cookie; the session list and sign out everywhere; every granting or destructive action needs a sign-in in the last ten minutes | What the session could read before it was ended |
| Someone with the parent's email | Signing in | Nothing, for a login without a passkey; every family is told by `login-changed` if they change the address or add a passkey | The reason passkeys come early, and the reason for a later "passkey only" setting |
| An automated sign-up flood | Filling the database, spending the email budget | No login or family is written until a code comes back; limits per address, per network and in total, counted from `keys` | Codes sent to addresses that did not ask, within the limits |
| Someone guessing codes | Signing in as a parent | Eight digits, five tries a code, ten an hour an address, ten minutes a code | Five in a hundred million, per code |
| Someone guessing the family's PIN | Getting a grown-up's session from a children's view | A minute's wait after five wrong tries and fifteen minutes after ten, counted on the PIN's key; the PIN stops at fifteen until a parent sets it again; the session it gives is shared and never fresh | Fifteen guesses in ten thousand before it stops |
| A tutor beyond their reach | Reading another kid, or reading after the window | The entry point works out the member's reach on every request, and the window is checked when a write arrives | What they read inside the window |
| Any member | Writing into a child's stream so it reads as the child's work | An event's `device` must be the caller's own key, and the server numbers every stream | |
| Someone who copies a view's cookie off the device | Writing work in a child's name, or reading their pages | The cookie is HttpOnly, so no script on the page can read it; a parent ends the view | Anything done with the copy before the view ends |
| Whoever obtains a copy of the database | Replaying sessions, children's views, codes or the PIN | Only hashes of secrets are stored, and codes and the PIN are HMACs under a key that is not in the database | The records themselves, which is why they hold so little |
| A mail scanner | Using up a sign-in link | The link's page needs a button press and only completes in the browser that asked | |
| Whoever receives a forwarded invitation | Joining the family | Accepting needs a sign-in as the invited address | |

## Rate limits, without a table of counters

Every limit is counted from rows we keep for another reason: `keys` for anything that sends an email, `attempts` and `seen_at` on a key for wrong codes and wrong PINs, and `events` for exports. Counting `keys` that belong to no family is done by definer functions; the rest runs inside the family's transaction. When a count fails, the request is refused, as llamatrade's auth limiter refuses, because a sign-in route that cannot count is one we should not be serving.

A used code is deleted at once, so these counts see only codes nobody has used. That is what a limit needs to see: a person signing in normally deletes their own code and is never slowed by their own successes, while a flood of codes sent to an address that did not ask for them stays in `keys` until it is swept, a day after it ran out, and is counted for all of that time.

The network is the client address as Render's proxy reports it, read in one function, with IPv6 addresses grouped by their /64, and it is stored only as a keyed hash in `keys.ip`. The grouping is there because Better Auth's limiter was bypassed in 2026 by rotating addresses inside one IPv6 allocation (CVE-2026-45364). Galleo reads `cf-connecting-ip` on the strength of a comment saying Render's Cloudflare front overwrites it; we could not confirm that in Render's documentation, so the deployment step includes sending a forged header to the live service and checking that the function ignores it.

| Limit | Subject | Budget | Counted from |
|---|---|---|---|
| Codes sent | one address | 3 in 15 minutes, 10 in a day | `sign-in` and `confirm` keys for that address |
| Codes sent | one network | 20 an hour | keys with that network hash |
| Codes sent | everyone | 500 an hour, after which sending stops and we are alerted | every unused `sign-in`, `confirm` and `invite` key |
| Wrong codes | one code | 5, after which the code is dead | the key's `attempts` |
| Wrong codes | one address | 10 an hour | the `attempts` of that address's keys |
| PIN tries | one family | 5 in a row, then one a minute from the last wrong one, one every fifteen minutes after 10, and none after 15 until a parent sets it again | the `pin` key's `attempts` and `seen_at` |
| Passkey attempts | one network | 30 in 5 minutes | `sign-in` keys for passkey challenges from that network |
| Invitations | one family | 20 a day | that family's `invite` keys |
| Events from a children's view | one request | at most 50 events and 1 MB | the request itself |
| Exports | one family | 5 a day | `exported` events |

None of these numbers is measured. They are meant to be generous to a family and tight to a script, and the table in `server/http.ts` is the one place to change them.

The PIN's limit is counted on the PIN's own key rather than on a view, so that nobody can clear it by opening another view or another browser: `attempts` is the wrong tries in a row, `seen_at` is the last wrong one, a right PIN sets `attempts` back to zero, and the row is locked while a try is checked. A view's events have no limit per minute. `events` has no time of its own recording, and a view that was offline for a few minutes sends what it held at once, so the limit is on the size of one request.

Earlier versions of this document limited pairing requests, pairing polls and batches from a tablet, and proposed dropping a limit on wrong pairing codes. All four went with the tablet.

A sign-up flood needs no captcha while nothing is written but a code until the code comes back. The trigger for adding one is the global sending limit being reached by traffic that never verifies. The likely choice then is Cloudflare Turnstile, on the grown-ups' app's start page only and never in the children's view.

## Email

The provider is Resend, as galleo uses, called with `fetch` from `server/email.ts` with a fixed From address on a sending subdomain aligned for DMARC. Resend publishes a data processing agreement (last updated 27 August 2026); its free tier (3,000 emails a month, at most 100 a day) covers development, and its Pro plan is $20 a month for 50,000. Postmark, whose agreement took effect on 17 November 2025 and whose Basic plan is $15 a month for 10,000, is the alternative if deliverability disappoints. In development with no key, every email is printed to the console, which is how a developer reads a code, and there is no bypass code. The response of every send is checked; flowmaestro uses Resend's SDK and never looks at the error it returns, so a failed send there goes unnoticed.

Everything it sends goes to adults:

| Email | To | When |
|---|---|---|
| Your code | the address that asked | sign-up, sign-in, a fresh sign-in, an email change |
| An invitation | the invited address | a parent invites a parent or a tutor |
| Someone joined, left or was removed, or a tutor's window changed | every parent, and the person concerned | at once |
| Your consent, what it covers, and how to withdraw it | the parent who consented | at once (flow 4) |
| A child was removed | every other parent | at once |
| The family was closed | every member | at once |
| A passkey was added; the address changed | the login, and for a change the old address as well | at once |
| A tutor's access has started, or ended | the tutor | on the first and last day |
| Nobody has used this family | every parent | at 17 months without use |

No email is ever sent to a child or about a child except to the family's adults, and no email contains a kid's name, work, marks or evidence. The family's name, which the family chose, may appear. A test renders every template against fixture children with distinctive names and fails if any of those names appears in a subject or a body. That keeps the email provider out of the set of third parties that hold anything about a child, which is what email plus depends on.

Email is never a way to get records out: the export is a download, and there is no weekly digest by default, which [parents.md](parents.md) already says should be off until a parent asks for it.

## The record of access

The record of who signed in, who joined and left, who opened and ended a children's view, who set the family's PIN, and who consented, is kept as events in the family's own log, alongside the kids' work, and not in a table of its own. It is the family's record: a parent reads it on a Security page, written as sentences ("Kate joined as a tutor for one kid on 5 October"), and it is part of the export. It lives as long as the family does, and it goes when the family is closed. A used code is deleted, and the event it produced is the record of it.

Each auth kind is recorded against the family, with `kid_id` null, so that none of them is removed when a kid is deleted: a consent record for a deleted kid holds the kid's id and the notice, and nothing that names the child. The server writes them, in the same transaction as the action they record, with an id it makes, the server's device stamp, and the user who acted as `actor`, or null for a sweep. Children's views and tutors never read them. They go in `engine/answer.ts` beside the kinds that exist, each with its check in the complete record there.

| Kind | `data` | `actor` | Written when |
|---|---|---|---|
| `signed-in` | `method` (`email-code`, `link`, `passkey`, `switch` or `pin`), `session` (the new session key's id), `shared` | the person | a session key is made, by sign-in, a fresh sign-in, a switch of family, or leaving a children's view with the PIN |
| `signed-out` | `everywhere` | the person | a session is ended, or all of the person's sessions in the family are |
| `session-changed` | `session` (the key's id), `change` (`put-away`, `restored` or `ended`) | the parent | a session is put away as a children's view opens on its browser, given back by the PIN, or ended because the view ended without it |
| `login-changed` | `user`, `change` (`email`, `passkey-added` or `passkey-removed`) | the person | a login's address or passkeys change; written in each family the person is an active member of |
| `member-added` | `user`, `name`, and for a tutor `kid`, `fromDay` and `toDay`; `invitedBy` | the person who joined | a family is started, an invitation is accepted, or a removed member is added again |
| `member-changed` | `user`, `kid`, `fromDay`, `toDay` | the parent | a tutor's window is changed |
| `member-removed` | `user`, `kid` for a tutor, `left` | the parent who removed them, the person who left, or null for the sweep | `ended_at` is set on a membership |
| `consent-given` | `kid`, `notice`, `method` | the parent | a kid is added, or a parent accepts a new notice |
| `consent-withdrawn` | `kid`, `notice` | the parent | consent is withdrawn |
| `kid-session-opened` | `view`, `keys` (each child's id and key id) | the parent who opened it | a parent opens a children's view |
| `kid-session-ended` | `view`, `keys`, `reason` (`ended`, `pin`, `sign-in`, `withdrawn` or `removed`) | the parent who ended it or left it with the PIN, the person who signed in when they are a parent, or null | a view's keys are deleted before they run out |
| `pin-set` | nothing | the parent | a parent sets the family's PIN |
| `kid-deleted` | `kid` | the parent | a kid is deleted |
| `exported` | nothing | the parent | an export is downloaded |

The final data model named seven kinds, and two of them, `device-paired` and `device-revoked`, went with the tablet. Five were added here, each for one reason. `signed-out` records the ending of sessions after a lost phone, which a parent will want to see on the Security page. `login-changed` is what "a used code is deleted, and the event it produced is the record" requires of the `confirm` code that changes an address, and a new passkey is the same kind of change to who can sign in. `member-changed` records a tutor's window moving, which grants or removes access as much as adding a member does. `kid-deleted` is the only record that a kid existed and who deleted them, since the kid's own events go with them. And `exported` is what the export limit counts, and a parent should be able to see that an export was taken. Three more replaced the tablet's two: `kid-session-opened` and `kid-session-ended` record who opened a children's view, on which browser and for which children, and why it ended, which is what a parent reads after a device goes missing; and `pin-set` records who last set the family's PIN, since the PIN hands a session back. `session-changed` came on 20 September 2026 with the put-away session: opening a view no longer ends the session, so `signed-out` there would have been untrue, and what a parent reads after a device goes missing is when a session was put away, given back or ended with its view.

A failed sign-in is not an event, because no family is known when it happens. It is the `attempts` count on a code, which is kept until the code is swept, a day after it ran out. We keep no longer record of failed sign-ins than the codes they failed against.

Two consequences follow from the record living in the family's log, and both are on the lawyer's list. A kid's consent record outlives the kid, holding their id and the notice. And when a family is closed, nothing of it remains in our database, including the record of consent and of who closed it; the email each member receives at that moment is the only record, and it is in their inboxes rather than ours.

## The schema, as auth uses it

The store agent owns the schema and its migration. This section says what auth reads and writes in each of the seven tables, what it needs the store to guarantee, and which security-definer functions it calls, so that the two can be checked against each other.

### Where each auth need lives

The first version of this document added ten tables, and the second used eight. Every need they met has a home in the seven.

| Earlier drafts | Final schema | How |
|---|---|---|
| `accounts` | `users` | One login across every family a person belongs to |
| `adults` as memberships, with a role | `members` | A parent has no `kid_id`; a tutor has a `kid_id` and a window; a removed member has `ended_at` |
| `sessions` | `keys` of kind `session` and `shared-session` | `created_at` is when the person proved themselves; `seen_at` is when they last used it |
| `devices` for a tablet, with a list of kids | `keys` of kind `kid-session`, one per child | The tablet went; each key's id is that child's stream in a children's view, and `detail` groups a view's keys |
| `auth_tokens`, `codes` | `keys` of kind `sign-in` and `confirm` | Deleted when used; kept a day after they run out, for the limits |
| `invitations` | `keys` of kind `invite` | The tutor's kid in `kid_id`, the days in `detail`, bound to the invited address |
| A grown-up PIN kept on each tablet | `keys` of kind `pin`, one per family | Checked on the server, with its wrong tries in `attempts` |
| Expiry and use columns | a rule per kind | Computed from `created_at` and `seen_at`; a used code is deleted |
| `rate_limits` | nothing | Counted from `keys` and `events`, as "Rate limits" explains |
| `auth_events`, `consents` | `events` of the thirteen auth kinds | Recorded against the family, and gone when the family is closed |
| `passkeys` | `users.passkeys` | A list in one column |
| `households.time_zone` | `families.time_zone` | |
| `last_active_at` | nothing | The later of the latest `signed-in` event and the latest `seen_at` on the family's keys |

### Table by table

`families`: `name` and `time_zone`, set when the family is started and changed by a parent. `time_zone` is what "today" means for a tutor's window. A family and its first parent are made in the store's one call, inside `withFamily` with the new family's id.

`users`: `email` is unique on `lower(email)`, and auth stores it trimmed and lowercased as well. `name` is the person's own name, shown in every family they belong to; each `member-added` event keeps a copy of it, which is what the family's record reads once a login has been closed. `passkeys` is a list of objects, each with the credential's `id`, its `publicKey`, `counter`, `transports`, `backedUp`, a `name` the person chose, `createdAt` and `lastUsedAt`. The store's policy lets a person insert, change and delete only their own row once `app.user` is set to them, which is how a login is created, a passkey recorded, an address changed and a login closed, without a definer function. There is no password column.

`members`: a parent's row has `kid_id`, `from_day` and `to_day` null; a tutor's has all three. The database allows one parent row per person per family, so two parents are two people with a row each, and one tutor row per person per kid. Removing a member sets `ended_at`; adding them again clears it on the same row, which is what the one-row rule requires. The database refuses any change that would leave a family with no active parent, and auth checks first so that it can say why.

`kids`: `name` and `grade` as the form sets them, and `settings`, where a child's picture may be named beside the journal's choice of worlds.

`keys`: one row per credential and per secret we send. The kinds, and what each uses:

| `kind` | `family_id` | `user_id` | `kid_id` | `email` | `name` | `hash` is of | `detail` | `attempts` | `ip` | Lasts |
|---|---|---|---|---|---|---|---|---|---|---|
| `session` | the family | the person | | | the browser | the secret | | | | 30 days idle, 90 absolute |
| `shared-session` | the family | the person | | | the browser | the secret | | | | 30 minutes idle, 12 hours absolute |
| `kid-session` | the family | the parent who opened the view | the child | | the browser | the secret | the view id | | | 30 days idle, 90 absolute |
| `pin` | the family | the parent who set it | | | | an HMAC of the family and the digits | | wrong tries in a row | | until set again |
| `sign-in` | | the login, if any | | the address | | the pending cookie, or the passkey challenge | the code's HMAC and the link's hash, or the passkey flag and browser; the form's answers; an invitation's id; when it was verified | wrong codes | the network | 10 minutes |
| `confirm` | | the person | | the new address | | the pending cookie | the code's HMAC, or a passkey registration's challenge | wrong codes | the network | 10 minutes |
| `invite` | the family | the inviting parent | the tutor's kid | the invited address | | the secret | the tutor's days | | | 7 days |

`events`: auth writes the thirteen kinds in "The record of access", and relies on four things. `device` has no foreign key to `keys`, as [db.md](db.md) decided from the start, so ending a children's view never touches the work its keys recorded. `id` is the writer's, which is what makes a view's resent chunk write once, and `(family_id, device, seq)` is unique. The server takes every stream's sequence numbers, its own included, under a lock on the family's row, so no two events can claim one place and nothing is skipped silently. And a kid-level event points at its kid through `(family_id, kid_id)`, so deleting the kid removes it.

`content`: auth reads it only to decide which of the family's content a tutor may see, which is the fold's work in code.

### The security-definer functions auth calls

Auth calls these through the store's client, and they are the only way it reaches rows outside the family `withFamily` has set. Each returns only what its step needs.

| Function | Used by |
|---|---|
| Write a key that belongs to no family; find one by hash; count a wrong attempt; mark one verified; delete one | sign-in, a new address and a passkey registration |
| Count unused keys by address, by network, and by family and kind, since a time | the limits |
| Find a login by address; find one by id | sign-in and passkeys |
| List the active families a login belongs to, with each family's id and name and the person's kid there, if any | choosing and switching a family, and anything that acts on a person in every family |
| List the families a sweep has work in: keys whose rule has run out, tutor rows thirty days past their window, and families unused for 17 or 18 months | the sweeps, which then work one family at a time through `withFamily` |

### What auth needs the store to confirm

Nothing in the seven tables stops auth. It relies on five things, and [db.md](db.md) confirms that all five hold.

1. A `kid-session` key goes with its kid through the `(family_id, kid_id)` foreign key, since a children's view keeps nothing of a child's to erase, and a family has at most one `pin` key.
2. `created_at` on a key can be set on insert, so that a session made by switching family carries the old session's `created_at` and switching never counts as a fresh sign-in.
3. A `pin` key's `attempts` and `seen_at` may be written on each try, under a lock on the row, for the PIN's limit.
4. The server's own events take their sequence numbers under a lock on the family's row, and are never written with `on conflict do nothing`.
5. The `keys` policy keys every row that has a family on `app.family`, like the other tables, and keys with no family are reachable only through the definer functions above.

## Sync

Sync is our own and small. The owner trialled PowerSync, self-hosted, in September 2026 and decided against it, since a replicated local database is more than a child's view needs, and on 14 September 2026 decided that a child's device keeps no copy of the log at all. A children's view keeps unsent answers in a short queue in the browser and sends them in chunks to `POST /api/kid/:kid/events` under that child's key, where the binding rules, the store's edge check and `withFamily` apply and the server stamps `device` and `seq`, and it reads what it shows from `GET /api/kid/:kid/state`. Flow 8 describes the queue.

## Where the code lives

[structure.md](structure.md) recommends no backend module until there is a backend, and one `server/` module of a few long files when there is. This work is what makes the backend real, so it creates `server/`. Each file below is one concept, in the sense structure.md uses, and the line counts are estimates.

```
lumischool/
├─ engine/answer.ts         gains the thirteen auth kinds, each with its check
├─ engine/ui/               wire.ts, the one request both clients share; api.ts, the grown-ups' client;
│                           kid.ts, the children's client and its queue; pictures.ts, each child's creature
├─ family/
│  └─ access.ts        ~200 the two kinds of membership, capabilities and the event-kind table, each
│                           a complete record, plus a member's reach on a day as a pure function
├─ store/                   the store agent's: withFamily, the definer functions, the queries auth calls
├─ server/
│  ├─ http.ts          ~500 the Hono app: the one origin's paths, the route table, the entry point, the capability
│  │                        check, the Origin and content-type rules, security headers, the limits table
│  ├─ auth.ts          ~600 codes and links, sessions, choosing and switching a family, fresh sign-in,
│  │                        passkeys through SimpleWebAuthn, invitations, consent, closing a login,
│  │                        opening, ending and leaving a children's view, and the family PIN
│  ├─ sync.ts          ~350 appends with the binding, for a person and for a children's view, and the
│  │                        reads a page draws from
│  ├─ email.ts         ~250 Resend by fetch, the console transport, every template
│  └─ jobs.ts          ~150 the sweeps: keys whose rule has run out, ended tutor windows, and unused
│                           families
└─ apps/
   ├─ kids/                 the children's view: main, closed, who, child and grown-ups
   └─ home/sign-in.ts  ~250 the sign-in, family and account pages, passkeys through @simplewebauthn/browser
```

The screens are built, in design B, as Solid components. The grown-ups' flows are in `apps/home`: `sign-in.tsx` for flows 1 and 2, `family.tsx` for flow 4 and the parent's half of flow 5 (opening a view, the family PIN, and the views open now), and `outbox.tsx` for the local outbox, which exists only on a developer's computer. The children's view is in `apps/kids`: `main.tsx` decides what the view shows, `closed.tsx` is the card that asks for a grown-up, `who.tsx` and `child.tsx` are flow 6, and `grown-ups.tsx` is the PIN card of flow 7. What both apps share is in `engine/ui/`: the page with its bar and the map behind it, the postcard, the form controls with the code input and the PIN's boxes, the children's stamps and `pictures.ts`, and the two clients over `wire.ts`, `api.ts` for the grown-ups and `kid.ts` for the children. `page.tsx` does not import `api.ts`, so the children's build carries none of the grown-ups' routes, and `check:kids-build` holds that. Sign-in links, passkeys and withdrawing consent are not built yet.

The sweeps in `server/jobs.ts` run on a timer inside the one process, and each is safe to run twice, because each acts only on rows whose own columns say they are due under their kind's rule. A restart loses nothing but a delay, which is why none of them meets [db.md](db.md)'s trigger for a jobs table or for Redis. On Render's free plan the service sleeps when idle and a sweep runs when it wakes; before launch the service should be on a paid instance, which galleo's `render.yaml` notes for the same reason.

`family/access.ts` is the first file of the root `family/` module that [structure.md](structure.md) plans. Its reach there is `pack`, `year` and `record`; typing over `EventKind` adds `answer` to it, which is one line in `boundaries.ts` when that file exists.

What the child's build may import is unchanged by this design, and one rule is added to what it may not. It may import what structure.md's run-time phase allows (`answer/`, `pack.ts`, `record/`, `lessons/`, `games/`, `ui/` and the rest). It may not import `server/db/`, which is `check:db`'s rule already, and it may not import `server/`, which is new. Its client, `engine/ui/kid.ts`, uses `fetch` and IndexedDB and has no dependency. The parent's build imports `family/access.ts` and `@simplewebauthn/browser`, and nothing from `server/` or `server/db/` either. `server/` itself may import `server/db/` and may not import the database driver or `drizzle-orm`, which is what keeps every query behind `withFamily` and the definer functions.

The server's environment adds two variables to the store's: `APP_ORIGIN`, the one origin, which the `Origin` check reads; and `AUTH_PEPPER`, the key for the HMACs of codes and the family PIN and for network hashes, which Render generates as galleo's `SESSION_SECRET` is generated. `RESEND_API_KEY` is as galleo has it, the database URLs are the store's, and `CLIENT_IP_HEADER` is as galleo has it once the header is confirmed. The server refuses to start in production without `AUTH_PEPPER` or `RESEND_API_KEY`. The ports are [local.md](local.md)'s: the API on 8501, and the one dev server on 8500 in development.

## Tests and guards

The integration tests follow the store's: `*.itest.ts` against a test database of their own, skipping when there is no database and failing when `LUMISCHOOL_REQUIRE_DB=1`. The HTTP tests call the Hono app in process through `app.request`, with no network, and connect as the application role, so that row-level security is exercised rather than bypassed. Names are written as the store's are, as the sentence the test proves.

In `family/access.test.ts`, which needs no database:

- every capability names parents and tutors
- no tutor holds a capability that grants access or destroys a record
- every event kind has a writer and a reader entry, which the type already requires, and every auth kind is written only by the server and read by neither a kid session nor a tutor

In `server/isolation.itest.ts`, the guards on the owner's first requirement:

- reads nothing of family B inside a request whose credential names family A, for every route in the table
- finds no key for a credential that names family B with family A's key id and secret
- refuses a session for family A on a request that asks for family B's kid
- refuses a membership with `ended_at` set on every route
- lets a children's view read only the children it was opened for, and none of the family's own records
- refuses a direct `select` from `keys` of rows with no family by the application role
- passes the guard that `server/` imports no driver and no `drizzle-orm`

In `server/http.itest.ts`, the guards that walk the route table:

- accepts a children's view cookie on no route outside `/api/kid/`
- accepts a session cookie on no route under `/api/kid/`
- refuses every state-changing adult request with no `Origin`, a foreign `Origin`, or a body that is not JSON
- reads only the session cookie on an adult route and only the view's cookie on a kid route, whatever else comes with them
- sends every response with the host's content security policy

In `server/keys.itest.ts`, the rule for each kind:

- ends a `session` thirty days after `seen_at` and ninety after `created_at`, and a `shared-session` thirty minutes and twelve hours after
- ends a `sign-in` or `confirm` key after ten minutes and an `invite` after seven days
- ends a `kid-session` key as it ends a `session`, and never ends a `pin` key
- deletes a code when it is used, and keeps an unused one for a day after it runs out

In `server/auth.itest.ts`, the adult flows:

- writes no login or family until the code comes back, and writes each exactly once when it does
- takes the fixed local code in place of the emailed one, which still works, and only for an address asked for in this browser
- refuses the fixed code in production like any wrong code, even with the value in the configuration
- answers the same way for an address with a login and one without
- refuses a sixth attempt at a code and an eleventh wrong code for an address in an hour, counting from `keys`
- completes a sign-in link only in the browser that asked, and never on a GET
- stores only the hash of a session's secret, and sets the cookie with every flag
- asks a login in two families which one, and makes the session in the one chosen
- switches family without making the session count as a fresh sign-in
- ends a person's other sessions and records `login-changed` in every family when a passkey is added or the address changes
- asks for a fresh sign-in before inviting, setting the family's PIN, exporting, deleting a kid, closing the family or removing the other parent
- accepts an invitation only as the invited address, and only once, and clears `ended_at` when it brings back a removed member
- sets `ended_at` and deletes the person's session keys when a member is removed, and still names them on what they marked
- never removes the last active parent or lets them leave, and lets two parents remove each other only one at a time
- refuses to add a kid without consent to the current notice, and records `consent-given` against the family
- withdraws consent by deleting the kid's keys in every children's view, and leaves the other children's keys working
- lets a tutor read and mark their kid on the first and last day of the window, and not the day before or after, and never the other kid
- refuses a tutor's plan change or day record, and any AI request from anyone but a parent
- deletes a kid in one transaction, with their keys in any children's view, keeps the consent events, and emails the other parents without the name
- closes a family and leaves each member's login, and lets a login with no active family close itself
- exports one family with its events and no hashes, passkey keys or codes, and never by email

For the children's view, in `server/__tests__/isolation.itest.ts`, `auth.itest.ts` and `demo.itest.ts`:

- stamps what a view sends with that child's key, no grown-up and the next place in its stream, whatever the draft claims
- refuses what a view may not send: another child, a kid's view for another family, a paper sitting, or too many at once
- refuses a children's view for a kid without consent, and setting the PIN without a fresh sign-in
- opens a children's view for Rosie and Leo, shows their work from the seed and Leo's tutor, and leaves it with the family's PIN

In `server/__tests__/kids.itest.ts`, a children's view from end to end:

- opens in place of the parent's session in one answer, holding a key for each child the parent chose
- refuses to open a view with no children, a child of no family here, or for someone not signed in
- hands the parent a shared session for the right PIN, which never counts as a fresh sign-in, and ends the view
- counts wrong PINs in a row, waits a minute after five and fifteen after ten, and clears the count on a right one
- stops the PIN at fifteen wrong tries in a row until a parent sets it again
- ends when a parent ends it from the family's page, on the browser that holds it, refusing what that browser had not sent
- ends when a grown-up signs in on the browser that holds it, which then holds only the session
- sends the cookie again when a use moves seen_at, holding only the keys still alive
- stamps a child's answers with that child's key in the view, and writes a retried chunk once

In `server/email.test.ts`:

- renders every template without any fixture kid's name in a subject or a body

In `engine/ui/__tests__/kid.test.ts`, the children's client and its queue:

- puts one kid's waiting events in chunks of at most fifty and 512 KB, oldest first, and each kid's in chunks of their own
- sends 510 answers recorded with no network once it is back, in chunks the API accepts, in the order they were made
- sends a chunk again when its answer was lost, and the API writes it once
- drops an event the API refuses, and the rest of its chunk and the chunks behind it carry on
- clears what was waiting and says so when the kid session has ended
- leaves the children's view with the PIN only once everything waiting has landed

In `engine/ui/__tests__/pictures.test.ts`:

- is a creature of their own for every family of up to twelve children

End to end, `tools/e2e/family.e2e.ts` drives the seeded Harlows, whose parents sign in with a code read from the local outbox: a parent opens a child's view on this device, and that browser's session is put away, refused on every adult route until the PIN; a grown-up goes round, out with the PIN to the family's page with no code and in again; a grown-up adds the other children from inside the view with the PIN, the children move between their own pages, and a reload opens on the pictures; answers given with no network for a minute arrive once it is back; a grown-up leaves the children's view with the family's PIN; and a parent ends every children's view from another device, and the view closes. Still to write: withdrawing one child's consent while a view is open for two, and a tutor with two families switching between them.

Four guards change. `check:db` lets `server/` import `server/db/`, adds a rule that no app imports `server/`, and adds a rule that `server/` imports neither the driver nor `drizzle-orm`. The outside-host half of `check:privacy`, which waits for the app split, is what enforces the children's build talking only to its own origin, and the content security policy test above is its run-time twin. And the complete records in `family/access.ts` are a guard in the type checker: a new event kind or a new capability does not compile until someone decides who may use it. And `check:kids-build` builds the apps with Vite, walks the chunks the children's entry loads, and fails on any `/api/` path outside `/api/kid/`; it runs in `npm run check`.

## Order of work

Each step is small enough to finish and review on its own, and "done" means `npm run check` is green with the step's tests in it. The store agent is building the seven tables now; step 1 is where the two pieces of work meet.

1. The store's side of auth. With the store agent, confirm the five points under "What auth needs the store to confirm", the definer functions, and the thirteen auth kinds in `engine/answer.ts`. Done: the isolation tests that need no server (a credential naming the wrong family finds nothing, `users` readable only through membership or by oneself, keys with no family unreachable by direct select) pass against the store.
2. The access rules. `family/access.ts` with its three complete records and a member's reach on a day, and `family` added to the `include` list in `tsconfig.json`. Done: its unit tests pass, and adding a dummy event kind in a scratch branch fails the type check.
3. The server skeleton. `server/http.ts` with the three hosts, the route table, the entry point and its two transactions, the capability check, the `Origin` and content-type rules, security headers and `/health`; `hono` and `@hono/node-server` added to the root manifest; `server` added to `tsconfig.json`; and `check:db` extended. Done: the route-table, isolation and key-rule tests pass against a table of stub routes.
4. Email. `server/email.ts` with the console transport, Resend, and every template in the table above. Done: the template test passes, and a code arrives at a real inbox from a development key.
5. Sign-up and sign-in by code and link. Starting a family with the store's one call, sessions as keys, choosing and switching a family, sign out and sign out everywhere, `/api/me`. Done: the tests for flows 1, 2 and 10 pass, and a person can sign up in a browser on `localhost:8500`.
6. People. Invitations as `invite` keys, accepting, removing with `ended_at`, adding a removed member back, leaving, and the last-parent rule. Done: flow 3's tests pass.
7. Kids and consent. Adding a kid with `consent-given`, the confirming email, withdrawing by deleting the kid's keys in every children's view. Done: flow 4's tests pass, and a draft of the notice is ready for the lawyer.
8. Children's views, server side. Opening a view with one `kid-session` key per child, the kid routes with the binding, a child's state, ending a view, the family PIN with its waits, and a sign-in ending the view a browser held. Done: the children's view tests pass, including the PIN's limits and a kid's consent withdrawn while a view is open for two.
9. Children's views, in the browser. `engine/ui/kid.ts` with its queue, the card that asks for a grown-up, "Who is learning today?", each child's page, and the PIN card, with `check:kids-build` in `npm run check`. Done: the queue tests pass, and a view opened on a real iPad for two children records through a minute offline and leaves with the PIN.
10. Fresh sign-in and the dangerous flows. Deleting a kid, closing a family, closing a login, the export download. Done: flow 12's tests pass.
11. Tutor windows. Tutor invitations with a kid and days, a tutor's reads and writes, changing a window, the end-of-window sweep, and a tutor with two families. Done: flow 9's tests pass, including both edges of the window.
12. Passkeys. Registering into `users.passkeys` through a `confirm` challenge, signing in with conditional mediation, listing and removing, and a passkey as a fresh sign-in. Done: a passkey created on a phone signs in on a laptop, and on a shared computer by QR.
13. AI authorisation. The generation routes behind an active parent's capability, charged to the session's family. Done when [ai.md](ai.md)'s routes exist: a children's view and a tutor are refused, and cost lands on the right family.
14. The sweeps. Keys whose rule has run out, ended tutor windows, and the inactivity warning and deletion. Done: each sweep runs twice with the same result, and works one family at a time through `withFamily`.
15. Deployment. The Render service with three custom domains and the new variables, the forged client address header test against the live service, the cookie flags checked on the live host, and the Neon backup window written into the retention policy. Done: a family signs up on the real hosts.
16. Before launch. The lawyer's answers to the questions below, the direct notice and the online notice written, the written security programme and retention policy that the amended COPPA rule requires, and written assurances from Render, Neon and Resend. Done: each answer is recorded in this document, and any change it forces is made.

## What changes in other documents

None of these edits is made by this document; they are listed so that the work in each step knows what else it touches.

| Where | What changes |
|---|---|
| `engine/answer.ts` | The thirteen auth kinds, with their fields and checks, from "The record of access" |
| `scratchpad/src/family/privacy.ts` | `STORED` says "a hash of their password"; it becomes "the public key of any passkey they add". `LEAVES` gains that a children's view sends a child's work only after a parent has consented and opened it |
| [parents.md](parents.md) | "What we store: the parent's email and a password hash" changes the same way. The tutor seat's "accounts, roles and an audit of who marked what" points here |
| [db.md](db.md) | Whatever the store agent has not already changed: sessions, children's views, the family PIN and codes are rows in `keys`, and the retention section's closure record and sweep are replaced by deleting at closure, if the owner agrees |
| [structure.md](structure.md) | `server/` gains `auth.ts`, `sync.ts` and `email.ts` beside `http.ts` and `jobs.ts`, and may not import the driver. `family` reaches `answer` |
| [journal.md](journal.md) and [story.md](story.md) | The world choice they propose as an event lives in `kids.settings`, beside a child's picture |
| [ai.md](ai.md) | The monthly budget is charged to the session's family, as flow 14 says |
| The scratchpad's site pages | The "leave an email address" placeholder becomes a `mailto:` link, if the owner agrees |

## Questions for a lawyer

Each is a question for Ontario counsel with US, UK and EU input where it says so. Where the design already assumes an answer, the question says what we assumed.

1. Is consent given in the app by a parent whose address was proved by a code, followed at once by a confirming email that repeats what was consented to and says how to withdraw (by signing in and pressing Withdraw), a valid use of email plus under 16 CFR 312.5(b)(2)(viii)? The staff FAQ's example of the confirming step is a second message sent "after a reasonable time delay"; does the rule require that delay? Does the confirming email need to name the child, given that we keep children's names out of email? The staff FAQ describes email plus as the parent indicating consent "in a return message" to the direct notice. If the act of consent happened in the email, by a reply or by pressing a button in the message we sent to the parent's address, rather than in the app after proving that address, would that be a stronger or a weaker use of email plus?
2. Are Render, Neon and Resend "support for the internal operations" of the service, so that using them is not disclosure? What written assurances does 312.8(c) require from each, and is a model provider that receives no child's personal information in the same position?
3. Is the first answer a children's view sends the moment of collection, so that consent before a view can be opened for a child is enough? Is the view's cookie, a persistent identifier made only after a parent has consented and opened the view, covered by the internal operations exception in 312.5(c)(7)?
4. When a parent grants a tutor access to one child, or later shares records with a school district, is that our disclosure, which would end email plus and require separate consent under 312.5(a)(2), or the parent's own act?
5. May one parent delete a child's record or close the family over another parent's objection? Does a signed-in parent role satisfy 312.6(a)(3)(i)'s requirement to ensure the requester is a parent? Does a parent removed from the family by the other keep a right to review the child's record?
6. What must the written security programme and retention policy contain for a company of our size? Are these acceptable statements: the record of sign-ins, children's views and consent kept for as long as the family is open, a children's view's keys kept thirty days after last use and ninety at most, the family's PIN kept until a parent replaces it, families unused for 18 months deleted, and data deleted at closure and gone from backups within the backup window?
7. Does deleting from our database satisfy a deletion request when copies exist in exports we handed the family? A children's view keeps nothing on the device but answers still waiting to be sent.
8. The record of consent is an event in the family's own log that holds the kid's id and the notice's version but not the kid's name, so it outlives the kid's deletion; and everything, including that record and the record of who closed the family, is deleted when the family is closed. Are both of those acceptable, or must proof of consent outlive the family for some period?
9. Should collection continue when the confirming email bounces, or pause until the parent confirms another way?
10. Under PIPEDA, is express parental consent at the moment a child is added enough for every flow in this design? What assurance of the parent's identity would the OPC expect, and what does its September 2026 draft guidance on service providers require of us for processors hosted in the United States?
11. Do Quebec's sections 4.1, 9.1 and 17 apply to an Ontario company serving families in Quebec, and what would the assessment for hosting outside Quebec need to contain?
12. Which of Bill C-36's obligations, as introduced, should we build for now?
13. Does the ICO's Children's code apply to us if UK families use the product, and which of its standards need product changes? The owner removed the child-facing monitoring sign on 14 September 2026 ("What the child is told"). Does the code's parental controls standard, which asks for "an obvious sign to the child when they are being monitored", require one for us, and does the Canadian commissioners' joint resolution of October 2023, which asks organisations to "make any monitoring or tracking obvious to the young person"? Do we need a data protection impact assessment and a UK representative?
14. For UK and EU families, is the lawful basis for the child's records a contract with the parent, legitimate interests, or consent under article 8, and is the consent step in this design the right instrument there? Is email verification of a parent "reasonable efforts" under article 8(2) for a service of this risk? Do we need an EU representative?
15. Which provisions of California's Age-Appropriate Design Code are enforceable after the Ninth Circuit's March 2026 decision, and are we a business it reaches? Could marketing to homeschooling families, some registered in California as private schools, make us an operator under the K-12 Pupil Online Personal Information Protection Act?
16. If a district ever sends us records, what do FERPA's limits on redisclosure (34 CFR 99.33) require of how we store and share them?

## Open decisions

The owner's decisions in "Decided" have closed ten of the first version's twenty questions: the library, passwords at launch, the roles, the three hosts, email plus, a second parent's equal rights, the grown-up gate, the lifetimes of sessions and of tablet keys, and where the switcher picture lives; the gate and the tablet keys have since gone with the tablet. These remain, each answerable in a sentence, with the recommendation after the question.

- Are magic links supported, and for what? We recommend the proposal in "Magic links": the emailed code stays the credential for every flow that sends one; the sign-in and address-change emails carry that same code inside a link that signs in only in the browser that asked and shows the code anywhere else; invitations stay links whose acceptance still proves the address; there is no withdrawal link, no approval by link between devices, and no link for children.
- Do passkeys ship in the first release, or just after it? We recommend the first release if steps 1 to 11 leave room, since they are the only phishing-resistant method here.
- Is there ever a kind of member between parent and tutor, such as the helper an earlier version proposed? We recommend not now; it would need a way to tell it from a parent in `members`, which the final schema does not have, and the trigger for adding one is families asking for a seat the handover pack does not cover.
- Should `withFamily` also set a tutor's kid, so that row-level security enforces a tutor's reach inside a family as well as a family's reach across the database? We recommend yes, as the store's decision, when the tutor seat is built.
- Is a kid always added with consent, even by a family that only uses paper? We recommend yes, as one rule.
- Does the confirming email go at once, or after a delay? We recommend at once, unless the lawyer's answer to question 1 says the rule needs a delay; a delayed send would need a sweep to find consents with no confirmation yet.
- Does a tutor see the whole of their kid's record, or only from the first day of the window? We recommend the whole record of that one kid.
- Is the retention window after closure simply the backup window, with deletion at closure? We recommend yes, which removes the closure record and sweep [db.md](db.md) planned.
- Is it acceptable that a closed family leaves no record, including of consent and of who closed it? We recommend yes, subject to the lawyer's answer to question 8, since keeping one would mean a row outside the family.
- Are unused families warned at 17 months and deleted at 18, with the time of last use read from `signed-in` events and keys' `seen_at` rather than a column? We recommend that shape; the numbers are the owner's.
- Does each key in a children's view keep one secret for its whole life, with no rotation? We recommend yes, since a parent can end a view from the family's page, with rotation added if a copied cookie is ever seen in use.
- Does a login get a second address for recovery? We recommend not at launch, and revisiting it if support sees lost-email cases; it would be one more field on `users`.
- Once a person has a passkey, may they turn off sign-in by email code for their login? We recommend offering it as a setting after passkeys ship; it would also be one more field on `users`.
- Does the marketing site's "leave an email address" placeholder become a `mailto:` link? We recommend yes, so that the site collects nothing.
- Is Resend the email provider? We recommend yes, as galleo uses it, with Postmark as the alternative.

## Sources

Read between 11 and 12 September 2026. Where a page carries no date of its own, the date given is the date it was read.

Libraries and guidance:

- Better Auth 1.7.4 on npm, and its releases on GitHub, read 12 September 2026. https://www.npmjs.com/package/better-auth
- "Better Auth is joining Vercel", 7 July 2026. https://www.better-auth.com/blog/better-auth-joins-vercel
- "Auth.js joins Better Auth", 22 September 2025. https://www.better-auth.com/blog/authjs-joins-better-auth
- Better Auth session management and rate limit documentation, read 12 September 2026. https://www.better-auth.com/docs/concepts/session-management and https://www.better-auth.com/docs/concepts/rate-limit
- GitHub advisories GHSA-qq9h-g4jm-xgf3 (24 July 2026), CVE-2026-53514 (7 July 2026) and CVE-2026-45364 (15 May 2026) for better-auth. https://github.com/advisories/GHSA-qq9h-g4jm-xgf3
- next-auth on npm, and the Auth.js credentials provider reference, read 12 September 2026. https://www.npmjs.com/package/next-auth and https://authjs.dev/reference/core/providers/credentials
- Lucia, deprecation announcement, 20 October 2024, and the site and `auth_session.ts`, read 12 September 2026. https://github.com/lucia-auth/lucia/discussions/1714 and https://lucia-auth.com/
- The Copenhagen Book, archived June 2026, pages on sessions, server-side tokens, email verification and CSRF. https://thecopenhagenbook.com/
- The Auth Book, pages on authentication methods, email codes, passwords and sessions, read 12 September 2026. https://auth.pilcrowonpaper.com/
- Neon Auth overview and roadmap, read 12 September 2026. https://neon.com/docs/auth/overview
- Supabase pricing and auth documentation, Clerk pricing, WorkOS pricing, read 12 September 2026. https://supabase.com/pricing, https://clerk.com/pricing, https://workos.com/pricing
- @simplewebauthn/server 14.0.1 on npm, and the v14.0.0 release notes, 2 September 2026. https://www.npmjs.com/package/@simplewebauthn/server
- Node.js crypto documentation (`crypto.argon2`, added in 24.7.0), read 12 September 2026. https://nodejs.org/api/crypto.html
- OWASP Password Storage Cheat Sheet and Session Management Cheat Sheet, read 12 September 2026. https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html and https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- NIST SP 800-63B-4, published July 2025. https://pages.nist.gov/800-63-4/sp800-63b.html
- RFC 8628, OAuth 2.0 Device Authorization Grant, August 2019. https://www.rfc-editor.org/rfc/rfc8628
- WebKit, "Full Third-Party Cookie Blocking and More", 24 March 2020. https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
- WebKit, "Updates to Storage Policy", 10 August 2023. https://webkit.org/blog/14403/updates-to-storage-policy/
- Render, custom domains, read 12 September 2026. https://render.com/docs/custom-domains
- Resend pricing and data processing agreement (updated 27 August 2026); Postmark pricing and data processing agreement (effective 17 November 2025). https://resend.com/pricing, https://resend.com/legal/dpa, https://postmarkapp.com/pricing, https://postmarkapp.com/dpa

Children's privacy:

- FTC press release on the final COPPA amendments, 16 January 2025. https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data
- Children's Online Privacy Protection Rule, Federal Register, 22 April 2025, 90 FR 16918. https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule
- 16 CFR Part 312, current text on eCFR. https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312
- FTC, Complying with COPPA: Frequently Asked Questions. https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- FTC, enforcement policy statement on audio recordings, 20 October 2017. https://www.ftc.gov/system/files/documents/public_statements/1266473/coppa_policy_statement_audiorecordings.pdf
- FTC, Edmodo, 22 May 2023. https://www.ftc.gov/news-events/news/press-releases/2023/05/ftc-says-ed-tech-provider-edmodo-unlawfully-used-childrens-personal-information-advertising
- OPC, Guidelines for obtaining meaningful consent, 2018. https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/appropriate-handling-of-personal-information/collecting-personal-information-and-consent/consent/gl_omc_201805/
- Joint resolution of federal, provincial and territorial privacy commissioners, October 2023. https://www.priv.gc.ca/en/about-the-opc/what-we-do/provincial-and-territorial-collaboration/joint-resolutions-with-provinces-and-territories/res_231005_01/
- OPC, consultation on a Children's Privacy Code, and What We Heard. https://www.priv.gc.ca/en/about-the-opc/what-we-do/consultations/completed-consultations/consultation-children-code/
- Bill C-27, LEGISinfo; Bill C-36, first reading, 15 June 2026. https://www.parl.ca/legisinfo/en/bill/44-1/c-27 and https://www.parl.ca/legisinfo/en/bill/45-1/c-36
- PIPEDA, current text. https://laws-lois.justice.gc.ca/eng/acts/P-8.6/FullText.html
- Quebec, Act respecting the protection of personal information in the private sector. https://www.legisquebec.gouv.qc.ca/en/document/cs/p-39.1
- ICO, Age appropriate design: a code of practice for online services, and its Annex C on lawful basis. https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/
- UK GDPR article 8, and the Children's Wellbeing and Schools Act 2026, section 72. https://www.legislation.gov.uk/eur/2016/679/article/8 and https://www.legislation.gov.uk/ukpga/2026/21/section/72
- Data (Use and Access) Act 2025, section 81. https://www.legislation.gov.uk/ukpga/2025/18/section/81
- GDPR, Regulation (EU) 2016/679. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679
- EDPB Guidelines 05/2020 on consent. https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf
- NetChoice v. Bonta, Ninth Circuit, 12 March 2026. https://netchoice.org/netchoice-v-bonta/
- California Business and Professions Code section 22584. https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=22584.&lawCode=BPC
- 34 CFR Part 99 (FERPA). https://www.ecfr.gov/current/title-34/subtitle-A/part-99

Magic links:

- Supabase, auth email templates (email prefetching) and passwordless email logins, read 12 September 2026. https://supabase.com/docs/guides/auth/auth-email-templates and https://supabase.com/docs/guides/auth/auth-email-passwordless
- Resend, "How do I maximize deliverability for Supabase Auth emails?", read 12 September 2026. https://resend.com/docs/knowledge-base/how-do-i-maximize-deliverability-for-supabase-auth-emails
- Microsoft, Safe Links in Microsoft Defender for Office 365, page dated 22 May 2026; and Advanced Outlook.com security for Microsoft 365 subscribers, read 12 September 2026. https://learn.microsoft.com/en-us/defender-office-365/safe-links-about and https://support.microsoft.com/en-us/outlook/advanced-outlook-com-security-for-microsoft-365-subscribers
- Microsoft, number matching in Authenticator push notifications, updated February 2026. https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-mfa-number-match
- Stytch, email magic links overview, read 12 September 2026. https://stytch.com/docs/consumer-auth/authentication/magic-links/overview
- NextAuth.js, avoiding corporate link checking, updated 29 October 2025. https://next-auth.js.org/tutorials/avoid-corporate-link-checking-email-provider
- FusionAuth issue 629, 2020 to 2021. https://github.com/FusionAuth/fusionauth-issues/issues/629
- Clerk, protecting email links, read 12 September 2026. https://clerk.com/docs/guides/secure/best-practices/protect-email-links
- Okta, email magic links overview, read 12 September 2026. https://developer.okta.com/docs/guides/email-magic-links-overview/main/
- Auth0, email magic link, read 12 September 2026. https://auth0.com/docs/authenticate/passwordless/authentication-methods/email-magic-link
- web.dev, OS integration and installation, 15 April 2022 and 20 September 2024. https://web.dev/learn/pwa/os-integration and https://web.dev/learn/pwa/installation
- WebKit, "WebKit Features in Safari 26.0", 15 September 2025. https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- Apple, WWDC 2017 session 225, "What's New in Safari View Controller" (Wayback snapshot of 10 October 2018).
- Apple, iOS 17 feature notes on one-time verification code AutoFill from Mail, read 12 September 2026. https://support.apple.com/en-us/118723
- Slack, "Sign in to Slack", read 12 September 2026, with its Wayback snapshots of 14 November 2019 and 4 November 2021. https://slack.com/help/articles/212681477-Sign-in-to-Slack
- Notion, log in and out, read 12 September 2026. https://www.notion.com/help/log-in-and-out
- Medium, "Signing in to Medium by email", 29 June 2015, and Medium's help page on signing in (Wayback snapshot of 11 September 2026).
- Linear, login methods, read 12 September 2026. https://linear.app/docs/login-methods
- The Auth Book, email code authentication, last edited 5 June 2026. https://auth.pilcrowonpaper.com/email-code-authentication
- The Copenhagen Book, email verification. https://thecopenhagenbook.com/email-verification
- OWASP, Email Validation and Session Management cheat sheets, 2026. https://cheatsheetseries.owasp.org/
- RFC 6750, OAuth 2.0 Bearer Token Usage, section 5.3, October 2012. https://www.rfc-editor.org/rfc/rfc6750
