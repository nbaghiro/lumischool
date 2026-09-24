# Authentication hardening checklist

Scope: the September 23 audit. Keep shared parent cookies and independent child tabs. No commits or deployment as part of this work. Existing map work is separate.

- [x] Atomic email issuance limits, delivery-failure recovery, honest resend wording.
- [x] Failed/in-flight kid attempt accounting and bounded family PIN cooldown (no permanent public lockout).
- [x] Central child consent / opening-parent eligibility checks.
- [x] Serialized manual and automatic usernames; try all friendly words before numbers; unchanged saves preserve sessions; remove obsolete enable contract.
- [x] One parent sign-out action with cross-tab and child-session regression coverage.
- [x] Trusted proxy configuration and deployment verification instructions.
- [x] Children’s sign-ins list: accurate labels, sign-in method, refreshed on return, clear revocation effects.
- [x] Browser storage / locking fallback with explicit failure behavior.
- [x] Preserve unlock retry metadata and present actionable feedback.
- [x] Email compatibility policy and audit procedure.
- [x] Automated auth unit, fresh-database integration, and browser regression checks; final manual QA checklist.

## Verification — September 23

- Server suite: 123 tests passed, including fresh-database migration, concurrency, eligibility, and privilege regressions. Final targeted unit run: 34 tests passed, including additional proxy CIDR validation.
- Auth browser suites: 42 tests passed across desktop, tablet, and phone; 4 passed on phone WebKit. Coverage includes independent child tabs, shared parent access, locking, revocation, and unavailable browser capabilities.
- Type checking and lint passed. Database (55), engine (497), school (341), and app (32) tests passed. Local migration applied and API restarted with final code for manual QA.
- The full repository check is **not green**: the tools suite reports a child-map script above its 380,000-byte budget and three mobile map snapshot mismatches. These shared-tree map checks remain release blockers; auth test success does not waive them. No budgets or snapshots were changed to hide the failures.
- Production proxy verification and production email compatibility audit remain deployment prerequisites below. No production changes, commits, or pushes were made.

New SQL belongs in forward migrations only. Production proxy behavior and existing production email data cannot be certified by local tests; record those deployment checks explicitly.

## Implemented behavior

- Successful kid sign-ins release their in-flight attempt reservation atomically. Five wrong PIN guesses across siblings cause a 15-minute cooldown; there is no permanent public kids’ PIN lockout. Identity/network limits still prevent guessing, including concurrent requests.
- Every child request checks current consent and parent membership; invalid keys observed during the check are revoked. Previously accepted requests may finish while a revocation is in flight.
- Manual and automatic username writes share the same global candidate lock. All 14 friendly words are tried before numeric suffixes. An unchanged normalized username preserves sessions. The obsolete `enabled` API field is removed.
- Email issuance has an atomic aggregate budget. Delivery failures invalidate the challenge and permit a bounded immediate retry. Resend wording describes independent tab challenges accurately.
- Parent sign-out ends only this browser’s current parent session. Children’s sign-ins show their origin and approximate activity dates, refresh on return to Account, and explain remote revocation.
- New sign-ins require session storage and Web Locks. Unsupported browsers get a clear message before submitting credentials; revocation stays available. Shared parent cookies and independent child tabs remain the product model.
- Migration `0004_auth_hardening.sql` is forward-only. New SECURITY DEFINER functions revoke PUBLIC execution and grant only the application role.

## Deployment checks

1. Apply migrations before starting the new API. Existing migrations 0000 through 0003 are unchanged.
2. Production requires Render's web-service environment markers and always reads `cf-connecting-ip`. No custom proxy configuration is needed. Local development uses its socket address. Follow the managed-ingress deployment policy below.
3. Verify the actual ingress overwrites the selected header. On a staging deployment, send different forged values from the same source and verify they share the same network budget; repeat against every reachable origin hostname. Verify requests from two genuinely different sources do not collapse into one proxy-address budget. Local tests cover trusted/untrusted peers, malformed headers, and aggregate budgets, but cannot certify hosted ingress configuration.
4. Run `node --import ./tools/scripts/resolve.ts server/check-auth-emails.ts` against the intended database before deploying. This is read-only and prints counts, never addresses. Stop and review existing accounts if unsupported or noncanonical addresses are found; never silently rewrite mailbox identities. Supported addresses are ordinary ASCII mailboxes, including plus tags and punycode domains. Local audit passed with zero incompatible addresses.
5. Restart the API after deployment; the local `dev:api` command does not watch source changes. No production deployment was performed by this task.

## Manual QA after automated checks

- Keep a parent tab and two independently signed-in child tabs open. Reload each, use different children, and confirm each keeps its identity.
- Sign a child out with and without queued offline answers. Siblings and the parent stay signed in; unsent work prevents voluntary switching/sign-out until it can sync.
- Lock parent access, unlock using the adult PIN, and verify a wrong PIN explains when to retry. The kids’ PIN cannot unlock parent access.
- Save a changed username, then try the old and new names. Saving an unchanged username is disabled and does not end an existing sign-in.
- Create children with a name already in use. Verify the friendly suffix and global uniqueness; test a short name and an accented name too.
- End one child sign-in remotely, then end all. Return to Account from another tab and verify the list refreshes. Completed work remains.
- Verify Sign out ends this parent session across tabs while children and other browsers stay signed in.
- Request/resend an email code in separate tabs. Use each tab’s appropriate code. Check invalid-email feedback and the kids/grown-ups switcher on a phone.
- Check Account layout, disabled unchanged save buttons, sign-in method labels, and touch targets on desktop, tablet and phone.

Temporary denial of service from sustained guessing remains possible with public short usernames and a shared four-digit PIN. The change bounds recovery time and avoids permanent lockout; it does not claim that four digits offer password-strength security. Fresh tabs can access an unlocked parent cookie by design; lock parent access on a shared device when that is unwanted.


## Render managed-ingress deployment policy

Production uses the Render public-ingress policy automatically; local development
uses socket addresses. No custom proxy settings are needed or read. Keep
`LUMISCHOOL_ENV=production`.

Render supplies `RENDER=true`, `RENDER_SERVICE_TYPE=web`, a nonempty
`RENDER_SERVICE_ID`, and `RENDER_EXTERNAL_HOSTNAME` ending in `.onrender.com`.
Production refuses startup without these markers. Do not manufacture them for
another platform: they detect configuration mistakes, not authenticate requests.
Supporting another host should be a deliberate implementation change.

[Render documents](https://render.com/articles/how-render-handles-ddos-attacks) that
public web ingress passes through Cloudflare and Render load balancers. Its XFF
recommendation does not define a stable chain position for this app to trust.
[Cloudflare documents](https://developers.cloudflare.com/fundamentals/reference/http-headers/)
`CF-Connecting-IP` as the client address sent to the origin, with Worker and
Pseudo IPv4 caveats. We choose that single header and require live verification
that Render preserves the edge-generated value. We do not parse XFF or infer
socket ranges. Missing, duplicated/comma-separated, or malformed client identity
returns 503 on API requests before database/auth work; it never falls back to the
shared socket address. `/api/health` and static assets remain available to probes.

Release gates owned by the deployer:

1. Before releasing this policy, verify the identity arriving at the process using an
   isolated preview diagnostic or the existing rate-limit records for controlled
   nonexistent-user requests. Keep automatic deployment enabled; complete this
   check before pushing. Do not add a permanent public diagnostic endpoint or log
   cookies, credentials, bodies, or raw IPs in the production app.
   From one known source, send normal requests and requests with forged
   `CF-Connecting-IP` values `198.51.100.11`, `198.51.100.12`, duplicated headers,
   and forged XFF chains. The arriving CF header must remain one valid source IP,
   never a supplied value or the load balancer's address. Repeat on the custom
   hostname, the `.onrender.com` hostname, and any additional ingress/proxy path.
2. Where available, repeat from a second network and IPv6. Distinct networks must
   yield distinct source identities. Account for VPN/NAT and Cloudflare Workers;
   worker traffic may deliberately share an edge identity. Same-zone Workers and
   header transforms are trusted configuration and must not allow user-controlled
   identity. Remove the temporary diagnostic before serving users.
3. Review Render private-network reachability. Direct private callers bypass the
   public edge and can forge this header. All services, preview workloads, shell
   users, and administrators able to reach the app port must belong to the trusted
   boundary. If untrusted workloads can connect, this mode is unsuitable: isolate
   network access or introduce an authenticated ingress before deploying it. A
   Host check, CF-Ray, private CIDR guess, or platform environment marker does not
   solve this boundary. The header affects throttling only, never authorization.
4. Keep the normal production settings and secrets; no proxy variables are needed. Verify health, email sign-in, kid sign-in and invitation
   sending after the controlled deployment. A 503 means the header contract failed;
   fix ingress or roll back, never switch to socket fallback to make it pass.

Local tests cover startup refusal, malformed/missing identity rejection, independent
network budgets and ignored forged XFF. They cannot prove the actual public edge
sanitizes headers. The release owner reported the production email audit passed
with one account and zero unsupported/noncanonical addresses; no further audit or
production configuration change was performed here.



## Simplification review

Implemented in this pass:

- One HTTP ingress policy per environment. Local uses the socket; Render production
  uses a validated single CF header. Removed configurable header names, proxy CIDR
  parsing, optional trust mode and the independent ingress boolean. Production
  cannot silently select a direct/socket fallback.
- HTTP startup validates Render's web markers; the weekly-mail job uses shared
  service configuration without HTTP ingress requirements. Both keep the same
  production secret, transport and fixed-code validation.
- Username suggestions choose a starting word directly rather than creating a hex
  string and parsing part of it. Word count and fallback bounds come from the same
  list. Existing saved usernames and the global uniqueness locks are unchanged.
- Updated transport documentation that incorrectly described parent and child
  access as mutually exclusive across the browser.

Remaining simplification candidates, not removed in this release pass:

1. Retire the old child-cookie transport as one complete change. Current clients
   request tab credentials, but `GET /api/kid/tab`, non-tab `openKidView`, cookie
   refresh, and put-away/restore bookkeeping still support the old model. Removing
   only the `tab` flag would leave inconsistent unlock/revocation behavior. Convert
   the cookie-based integration fixtures and remove the adoption path together;
   preserve independent child credentials.
2. Likewise, retire the pending email-challenge cookie branch after converting the
   server/browser fixtures to the per-tab challenge contract. Current web clients
   already request `{tab:true}`. This can remove another transport selector, but
   must preserve parallel sign-in challenges and invitation email proof.
3. Consolidate the historical auth/API flow descriptions into the current contract.
   The top-level implementation notes supersede older proposals, but duplicate
   descriptions still make review harder. The actual transport paragraph is now
   corrected; a full historical-document rewrite is separate from runtime work.

Intentionally retained: separate adult and kids' PINs, per-tab child credentials,
shared parent cookies, browser auth locks, fresh email verification for sensitive
changes, and in-transaction membership/consent rechecks. Each enforces a different
security or concurrency boundary. Also retained two levels of email validation:
client feedback and authoritative server enforcement use the same `emailOf` rule.
No generalized settings framework or new auth-state abstraction was introduced.

### Simplification validation handoff

- Complete server suite: 132 passed, zero skipped
  (`/tmp/auth-simplification-server.log`). Includes local header spoofing rejection,
  production independent client budgets, invalid-header failure, production auth
  fixtures, username collisions, and membership/invitation integration.
- Username/email unit suite: five passed, including every starting word and short
  or non-Latin names. Type checking, focused lint/format and diff checks passed.
- Full check currently stops at three concurrent painting lint errors in
  `engine/painting.ts`, `engine/ui/painting-workspace.ts`, and
  `engine/ui/painting-easel.ts`. Those files were not modified by this pass.
- No browser UI/session behavior changed. No new migration, service restart,
  production mutation, commit or push. Edits frozen after this handoff; no further
  database tests will run from this session unless new work is authorized.


## Account sign-out simplification

Account has one Sign out action with “Children stay signed in.” The standalone parent-lock action and its endpoint have been removed. Remote parent sessions
and children’s sign-ins keep their individual management controls. Removed both
bulk parent sign-out and browser-wide sign-out from UI, client helpers, HTTP and
unused database helpers. The existing signed-out event shape remains unchanged;
new single-session sign-outs record `everywhere: false`. No migration is needed.


Validation for account sign-out simplification: all 136 server tests passed, with
zero skipped, and all four targeted desktop/phone browser tests passed. Typecheck,
focused lint/format and diff checks passed. Full repository validation stopped on
five concurrent map lint errors; the sign-out pass did not modify those map files.
No new migration is required. Restart the local API to load the removed endpoint;
`dev:api` does not watch server sources. No service restart, commit or push was
performed by this pass.
