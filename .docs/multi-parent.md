# Multiple parents in one family

All parents have equal access. There is no owner/admin tier. Each uses their own verified email
account, shares the family's adult PIN, and independently chooses weekly email delivery. The kids'
PIN stays separate. Signing in as a parent is shared across that browser's tabs; child sessions remain
per tab. Two adult identities in the same browser are not isolated parent workspaces.

## Product

Account has a Your family card with editable family details and a Parents section: active parents, pending/expired invitations, Invite a parent,
Resend, Cancel, Remove, and Leave. Forms and confirmation appear only when needed. The last parent
cannot leave. Removal keeps historical contributions and suggests changing both shared PINs.
The card refreshes on return to the tab.

Invitations use the existing illustrated email frame and harbour artwork. The recipient follows
/join#t=..., reviews the family and full-access role, enters their name, receives a normal email
code at the invited address, and presses Join family. A new account is created only after proof;
an existing account retains its other family memberships. The flow always proves the invited
address afresh, avoiding a separate wrong-account/switch-account branch.

Membership notifications go to existing parents, excluding the joining parent, when someone joins, and to the removed person and all
parents when access ends. They contain no child details or PINs. They are independent of weekly
email choices. Removal delivery failures are surfaced after the change. Join delivery failures are logged; they never block signup or roll back access. These notifications are attempted immediately;
there is no durable background retry queue for membership notifications yet.

## Security and persistence

- Invitations are hashed 32-byte secrets, family scoped, single-use and valid for seven days.
  The URL fragment keeps the secret out of HTTP page requests; API preview and acceptance use POST.
  Preview cannot grant access. The email proven by the code must match the invitation.
- Invite, resend, cancel, removal and leaving require active parent access. Existing and PIN-unlocked parent sessions can manage members without another email sign-in.
- Acceptance, cancellation, membership checks and removal serialize on the family row. Concurrent
  removal cannot orphan the family. The existing database last-parent trigger remains a second guard.
- Cancellation/acceptance retains inactive invitation metadata for rate limiting. Resend rotates
  the secret. Delivery failure cancels the new invitation and tells the sender.
- Forward migration 0005 adds a narrow SECURITY DEFINER reservation function, with PUBLIC execution
  revoked. Limits: one invitation per address per minute, three per hour, twenty per network per
  hour, ten per family per hour, plus the shared global issuance budget. No account lookup is
  exposed to the sender. Sign-in code issuance is not blocked by the invitation's per-address limit.
- Every mutation rechecks active parent membership inside its transaction. Removed parents lose
  this family's parent sessions, their child-session keys, pending invitations they issued, and
  weekly delivery. Other families are unaffected.
- Shared PIN hashes survive removal. Their setter association transfers to a remaining parent so
  username-based kid sign-in remains usable. Child sessions sponsored by the removed parent end.
- Past consent events and learning records stay intact. Authenticated requests already in flight
  elsewhere may finish; subsequent requests recheck membership.
- No new roles or membership table are needed. Existing members, keys and family audit events hold
  the state. Tutors are not exposed by this parent-only feature.

## API

GET /api/members returns parents and pending/expired invitations, without hashes or secrets.
POST /api/members/invite takes email; POST /api/members/cancel takes id.
POST /api/members/remove takes user and returns left plus notificationFailed.
POST /api/invitations/preview takes token.
POST /api/auth/email/invitation/accept takes token, code and name plus the tab's sign-in challenge;
it returns the normal parent session. Join notifications run independently after commit and do not delay the response. Delivery failures are logged without personal data.

## Manual QA

1. Account → Your family → Invite a parent. Inspect the email in /outbox locally.
2. Open the link in a separate browser/profile, enter a name, verify the emailed code, and join.
   Confirm the same children, Calendar and settings are available to both parents.
3. Check a new user and someone already in another family. The existing account can still choose
   its other family. Both parents can use the same adult PIN; it cannot replace email sign-in.
4. Cancel an invitation and try its link. Resend after the cooldown; only the new link should work.
5. Remove the second parent and confirm their access ends, while the remaining parent can work.
   Reinvite, join again, then have the second parent remove the original PIN setter. Kid sign-in
   should still work with the same username and kids' PIN.
6. Try leaving as the last parent, and verify management still works after ten minutes without another sign-in.
7. Check invitation, joined, and removed emails at phone/desktop sizes in /outbox?previews.
   No child data or PINs should appear.

## Validation

The full required LUMISCHOOL_REQUIRE_DB=1 npm run check passed, including fresh-database migration
replay, 129 server tests, and the repository's map/build gates. The final targeted membership/email
run passed all 10 tests, including the added shared-PIN and personalized-email escaping checks.
Desktop, phone and phone WebKit passed the complete invite, join, and remove flow. The final app
checks and both build checks passed as well.

All 13 email designs were rendered at phone and desktop widths without overflow; the invitation
was visually inspected. The Family members card and Join page were visually reviewed. Local
migration 0005 is applied and the API is running the new routes. No production email, commit,
push, or deployment was performed.


Invitation recovery: acceptance and cancellation serialize on the family row. Cancellation after acceptance returns a conflict and refreshes the parent list, directing the parent to Remove instead. The invitee refreshes availability on foreground and before sending a code, and refreshes after acceptance failures. Used or unavailable links offer ordinary sign-in for interrupted signup. Resend replaces earlier links even if delivery fails; the UI explains this and refreshes the list so the parent can retry. Notifications remain best effort without a durable retry queue.
