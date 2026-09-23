# Weekly parent email

Implemented 23 September 2026. Weekly delivery is off until each parent explicitly opts in.
Production scheduling is not enabled by this feature change.

## Parent experience

Account contains a compact Weekly email section at /account#weekly-email. Each parent chooses
independently for each family:

- No weekly emails (default).
- A reminder to review our week: no child names or learning details, with a link to the family Home page.
- The full weekly report: child names and evidence-backed summaries in the email, with explicit consent
  to send those details through Resend and the recipient's email provider.

Both email formats link to Home for the children's journals and follow-up actions. Reminder copy
also points parents toward Calendar for planning. Email footers link directly to the Account
preferences section, with an independent signed unsubscribe link. Authentication email is unaffected.

There is no separate Letters screen, historical letter browser, print surface, reading API, or
compatibility redirect. Home, journals, and Calendar remain the in-app places for recorded work,
parent attention, and planning. Existing private-mode preferences remain private reminders; they
are never upgraded to detailed delivery automatically.

## Report content

The deterministic writer in school/family/letter.ts derives recorded topics, completed sessions,
recurring authored feedback, unmarked paper work, pieces awaiting response, requests for adult help,
and the coming week's plan. It does not infer mastery or invent teaching activities. Every factual
statement must map to recorded evidence.

Quiet weeks say "No work was recorded", not that no learning happened. Work on paper or awaiting
sync may be absent. If there is no recorded work, pending action, or upcoming plan, no email is
queued. Reports cover the completed Monday through Sunday in the family's time zone.

The full report is assembled at dispatch. Later marking and sync can change current records;
the app does not offer an immutable sent-email archive.

## API and delivery

- Parent-only GET /api/letters/preferences returns the current recipient's mode without loading the
  lesson pack or generating a report. POST at the same path saves off, private, or detailed.
- /api/letters/unsubscribe uses a signed token granting only opt-out. GET confirms; POST applies,
  including one-click unsubscribe requests.
- npm run mail:weekly runs with WEEKLY_EMAIL_ENABLED=1 and the compiled pack. Schedule hourly.
  Monday delivery begins at 08:00 in each family's time zone, with retry and catch-up afterward.
- 0001_weekly_mail.sql defines family-isolated preferences and delivery bookkeeping. No new migration
  is needed for the simplified UI. Existing migrations remain unchanged.
- Durable delivery rows prevent duplicate weekly sends. Retries reuse the payload and provider key.
  Uncertain delivery after the retry window requires reconciliation, not a new send.
- Resend posts signed weekly-tagged delivery events to /api/email/webhook. Set RESEND_WEBHOOK_SECRET.
  Permanent failures and complaints suppress further weekly delivery. Disable open/click tracking.
- Queued payloads are cleared on terminal states, deletion/consent withdrawal, or expiry. Weekly
  uniqueness records remain.

Before enabling production delivery, apply migrations, configure the scheduler/webhook and tracking
settings, and review a real inbox only with an explicitly selected recipient. No production delivery
or provider configuration was changed by this work.

## Development and QA

/outbox?previews is a local-only gallery of fictional email designs. npm run mail:previews exports
HTML/text examples; npm run mail:review renders desktop and phone previews. These are not claims
of Gmail, Outlook, or Apple Mail certification. Account notice templates in that gallery do not
imply that every associated product flow exists.

Manual QA:
1. Open Account and find Weekly email. The loaded choice should match the saved preference.
2. Change to reminder, full report, then off, saving and reloading each time.
3. Confirm Save is disabled for an unchanged choice; failures preserve the selected choice for retry.
4. Check the layout on phone and desktop, including the disclosure and keyboard access.
5. Review local email previews: reminders contain no child data; full reports do; both point to Home,
   and Email preferences opens Account at the settings section.
6. Verify there is no Letters link or page. No /letters redirect is provided.

## Validation result

The simplification passed desktop and phone browser tests for all three preference choices,
persistence, unchanged-save disabling, and removal of the Letters route. Server tests cover the
preferences endpoint and email privacy/destinations. The local API was restarted with the change.

Type checking, lint, formatting, guards, database tests (55), server tests (124), engine tests (497),
school tests (341), app tests (32), and both build checks passed. The full repository check still
fails on the existing child-map script budget (382,554 bytes versus 380,000) and three mobile map
snapshot differences. Those shared-workspace map failures remain separate release blockers.
No real email, production scheduling change, commit, or push was made.
