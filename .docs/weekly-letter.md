# Weekly parent letter

Implementation, 23 September 2026. The owner approved execution. Weekly emails are off until each
parent explicitly selects private-link or detailed delivery. Production scheduling is not enabled.

## Implemented surfaces and operation

- `/letters`: parent-only weekly letters, previous weeks, print and per-family recipient preferences.
  Past weeks are explicitly reconstructed from current records, not immutable sent-email archives.
- `/outbox?previews`: local-only gallery of 13 fictional emails, including sign-in, eight account
  notice designs, and four weekly variants. Account notice designs are reusable templates; their
  corresponding invitation, account-closure and similar product flows are not implemented by this
  change. Existing sign-in delivery uses the new HTML design immediately.
- `npm run mail:previews`: standalone HTML/text examples in `dist/mail-previews/`.
- `npm run mail:review`: renders all designs at phone/desktop widths in installed Chrome and saves
  selected screenshots. This is not a Gmail/Outlook/Apple Mail rendering certification.
- Shared email covers use six existing worlds: harbour, meadow, kitchen, railway, open sea and woods.
  Account notices vary by type, sign-in covers rotate daily, and weekly letters rotate by reporting
  week. Covers are public decorative assets without recipient data. Export them from the live map
  with `node --import ./tools/scripts/resolve.ts tools/scripts/email-art.ts`.
- `0001_weekly_mail.sql`: two operational tables, `mail_preferences` and `mail_deliveries`, with
  forced family RLS. The initial deployed migration remains unchanged. Delivery records are separate
  from progress events. Payloads are cleared on terminal dispatch states, deletion/consent withdrawal,
  or expiry; weekly uniqueness records remain to prevent future duplicate sends.
- `npm run mail:weekly`: run hourly using the application's environment, `WEEKLY_EMAIL_ENABLED=1`,
  and the compiled pack. The Monday run starts at 08:00 in each family's zone and retries/catches up
  later. It never sends before recipient opt-in. Local mode uses the console transport.
- Configure Resend to POST delivered, bounced, complained, failed and suppressed events to
  `/api/email/webhook`, with `RESEND_WEBHOOK_SECRET` set on the API. Only signed weekly-tagged events
  affect this feature. Disable open/click tracking for the sending domain in Resend.
- `GET /api/letters` and `POST /api/letters/preferences` require an active parent session.
  `/api/letters/unsubscribe` uses a signed token granting only opt-out. GET shows a confirmation;
  POST applies it, including one-click unsubscribe requests. Authentication emails are unaffected.

Before enabling a production cron: apply the forward migration, deploy the new API and assets,
configure the webhook and tracking setting, and check a designated recipient's real inbox when
explicitly requested. No production email or provider configuration was changed during development.
An existing dev API process must restart to load new routes; Vite updates client files separately.

## Local validation

`LUMISCHOOL_REQUIRE_DB=1 npm run check` passes all 1,026 tests without skips, including the
forward-migration replay, family isolation, parent access, concurrent claims, retry identity,
unsubscribe, webhook signatures and complaint suppression. The local database has the forward
migration applied. The API and Vite were restarted to load the routes and artwork.

All 13 fictional HTML emails render without horizontal overflow at 390 px and 1,000 px in Chrome.
The running app's gallery serves those designs and the artwork. A browser check using fictional
letter API responses verifies the reading page, preference save and both viewport widths; server
integration tests independently cover the real authenticated routes. No real email was sent.

The following design detail records the intended experience and remaining extensions. The current
summary includes recorded topics, completed lesson sessions, recurring authored feedback, unmarked
paper work, pieces awaiting response, requests for adult help and the next week's plan. It does not
infer mastery or invent teaching activities. Sheet previews remain in the existing calendar/map
flows, reached by links rather than embedded in the email. Custom delivery times and frozen historical
letters are future extensions.

## The experience

One message per family per subscribed parent, with a short section for each child. The default is
Monday at 08:00 in the family's time zone, covering the completed Monday–Sunday week.
Show the coverage dates and cutoff; later work appears in the in-app record and can be mentioned in
the following letter without counting it twice. The coming week's plan is a snapshot at send time.
The hourly scheduler catches up after outages without sending a second copy of the same week.

The message should answer: what happened, what deserves attention, and what to do next. Aim for
roughly 150–220 words per child, omit empty sections, and keep the complete record behind an app
link. Never rank siblings or make grades, streaks or screen time the centre of the letter.

| Section | Useful content | Evidence and limits |
|---|---|---|
| Letterhead | Brand, week dates, gentle world illustration | Existing root brand and scenery; static decorative assets |
| Opening | One factual sentence about the week | Distinct days and completed sittings; distinguish lessons from repeated sittings |
| What we explored | A few named topics across active subjects | Actual recorded work and curriculum titles; do not give maths permanent priority |
| A moment to notice | One specific completed piece or documented improvement | Correctness must be supported by marked answers; a submission alone proves no mastery |
| Something to revisit | At most one recurring authored mistake and a useful next step | Distinct days with the same rule, ideally the same skill/item context; label as observed, not a diagnosis |
| A little help from you | Pending marking or an explicit request for adult help | Current outstanding state at generation, with an authenticated link |
| Next week | Two or three planned topics, days and necessary materials where authored | The family's actual plan; omit guessed supplies, durations and invented activities |
| Closing | Guide signature and link to the full letter | Make clear this is assembled from recorded work |
| Footer | Weekly-letter preferences, stop letters, coverage cutoff | Preferences are per recipient; stopping letters does not stop sign-in email |

Fictional example, for copy discussion only:

> Dear Sam,
>
> This week, Mira worked on number bonds, describing characters and making repeating patterns.
>
> **A moment to notice**
> On Thursday's number-bond sheet, every recorded answer was right on the first try.
>
> **One thing to revisit**
> On two days, Mira counted the starting square as the first step. The lesson's suggestion is to
> put a counter on the start and move it once for each step. You can open those questions below.
>
> **A little help from you**
> One writing sheet is waiting for your response.
>
> **Coming next**
> Monday starts with sharing into equal groups. On Wednesday, the plan returns to character writing.
>
> From the paper bird at the harbour
>
> Open this week's letter

Every factual sentence in production must map to evidence. The example does not claim these events
or that particular teaching suggestion exist in the live catalogue.

Quiet weeks say “No work was recorded” rather than “No learning happened.” A planned holiday can
skip the email. If there is no recorded work, pending action or upcoming plan, skip by default.
Missing device sync must never become a claim that the child did nothing. Do not repeat the same
unresolved mistake indefinitely as the letter's headline. Handle paper work awaiting marking,
midweek joins, multiple children, no future plan and changed world settings explicitly.

## Visual direction

Use a 600 px single-column letter on the app's pale desk colour (#f4f6f8), white paper, dark ink
(#22262e), blue links (#2a4bbf), and restrained yellow highlighting (#ffd64a). Keep the illustrated
world strip, a small guide and postmark/date treatment from the prototype. Let generous spacing
and short paragraphs carry the hierarchy. One primary action per child; no dashboard of metrics.

Build an email-specific HTML layout with inline styles and presentation tables. Body text remains
selectable text with readable fallback fonts; essential meaning must survive blocked images.
Export decorative artwork from root assets to static PNGs rather than relying on interactive SVG,
custom fonts, JavaScript, complex CSS or animation. Avoid personalised public image URLs and
embedded screenshots of answers in the first version. The authenticated web letter can show sheets
and provide print styling. Verify Gmail, Outlook and Apple Mail, narrow screens, image blocking,
plain text and client-forced dark appearance before claiming email fidelity.

## Ownership and delivery guarantees

`server/email.ts` uses Resend via fetch, sends HTML and plain text, and retains the provider message
ID in durable weekly delivery records. The local sign-in outbox remains in-memory.
`school/family/sheets.ts` already derives sheet status, authored mistakes and first-try correctness.
The prototype's `family/letter.ts` supplies a useful deterministic writer, but its maths-first order,
fixed Friday dating and assumptions about evidence should be revised rather than copied verbatim.

Implemented ownership:

- `school/family/letter.ts`: evidence selection and deterministic narrative, with source references.
- `apps/home/`: authenticated weekly archive, sheet links and printable full letter.
- `server/`: HTML/text rendering, eligible-recipient lookup, delivery coordination and Resend transport.
- Root tools: fictional previews and exported decorative artwork; no scratchpad imports or URLs.

A small escaped server renderer supplies the templates without adding React to this Solid app.

Use an external scheduler running the server-side CLI, with a durable delivery record keyed by family,
recipient and reporting period. It needs atomic claiming, bounded retry, provider ID/status,
generation cutoff and payload/template identity. The forward migration adds that database-backed
queue separately from browser storage, sign-in keys and child progress.

Generate from family-scoped data and recheck active parent membership, address and preferences
immediately before dispatch. Tutors and other relatives are not automatic recipients. Keep messages
separate per parent, not a shared To/CC list. Normal app links require authentication and current
membership. Preference tokens must grant only preference changes, not access to learning records.

Retry the same payload with a stable Resend idempotency key. Resend retains keys for 24 hours, so
the app's delivery record must prevent duplicates beyond that window. Treat an uncertain result
after key expiry as requiring reconciliation, not an automatic fresh send. Verify webhook signatures,
deduplicate events, and distinguish API acceptance from delivered, bounced or complained status.
Suppress further weekly sends on applicable permanent failure/complaint. Disable open/click
tracking for this feature. Weekly unsubscribe must remain independent of authentication mail.

## The content-delivery choice

The previous policy said “email never mentions a child.” The approved implementation adds a narrow
exception for detailed weekly letters explicitly enabled by the receiving parent. CLAUDE.md and the
parent-facing notice now describe that exception; the notice version is `2026-09-weekly`.

The implemented modes are off, private link and detailed. Off is the default. Preferences show what
Resend and the recipient's email provider receive before the parent saves their choice.

## Reviewable implementation slices

1. Agree content-delivery mode, cadence and family-versus-child grouping; build fictional HTML/text
   previews for a normal week, several children, paper work awaiting review and a quiet week.
2. Build evidence selection and the in-app letter. Test factual provenance, repeated attempts,
   calendar boundaries, pending work and missing data. Decide whether historical letters are
   versioned snapshots or explicitly labelled live reconstructions.
3. Add email rendering and HTML preview to the local outbox. Check escaping, links, missing images,
   mobile layout and real email clients using a designated test recipient when requested.
4. Add preferences, durable delivery bookkeeping, scheduler and signed webhook handling. Test
   retries, concurrent jobs, access removal, unsubscribe, daylight-saving changes and timeouts.
5. Enable sending only after a reviewed real-data preview and an explicitly selected recipient
   scope. Retire the scratchpad letter once its retained behaviour and data are accounted for.

Provider references checked 23 September 2026:
[send API](https://resend.com/docs/api-reference/emails/send-email),
[idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[delivery events](https://resend.com/docs/webhooks/event-types).
