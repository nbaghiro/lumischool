# Deploy

Status: production Neon database migrated and verified on 23 September 2026. Render application deployment is a separate step. The recipe below includes the original deployment planning notes.

## Remaining launch steps (23 September 2026)

- Neon is ready. GitHub `main` exists; the remote head checked was `be6a47f`.
- Production has only `0000_initial`. The new `0001_weekly_mail` migration is pending and will run
  during the next Render build. Weekly delivery remains off until a scheduler and the optional mail
  environment settings are configured; see [weekly-letter.md](weekly-letter.md).
- Render's `lumischool` project (`prj-daojrs8ae00c73cqdpug`) and `Production` environment
  (`evm-daojrs8ae00c73cqdpv0`) exist, but contain no service.
- The root `render.yaml` now explicitly names the GitHub repository and uses
  `autoDeployTrigger: commit` for `main`. Render's validator returned `valid: true`, with one planned
  service. Publish this change before connecting the Blueprint. The current checkout also contains
  ongoing child-login changes; settle and validate the release commit before deploying it.
- Confirm `lumischool.ai` as the primary domain and configure a verified Resend sending domain,
  `RESEND_API_KEY` and `RESEND_FROM`. The production server requires these email values to start.
  Keep the API key in `.env.production.local` or Render's secret environment configuration, never Git.
- Create the web service in the existing Production environment, in Ohio on Starter, from the
  connected GitHub repository. Use the commands and environment configuration in `render.yaml`.
  The direct owner and pooled app database URLs are already saved privately. Keep the generated
  `AUTH_PEPPER` stable. Start with the assigned HTTPS Render hostname as `APP_ORIGIN`.
- For Blueprint management, connect the repository through New > Blueprint and leave Auto Sync on.
  Service auto-deploy on commits and Blueprint Auto Sync are separate settings; both should be on.
- Wait for a successful deployment and `/api/health`, then register the custom domain on Render.
  Squarespace currently hosts DNS: the apex has four Squarespace A records and `www` points to
  `ext-sq.squarespace.com`. Replace those web records after the service is healthy:

  | Host | Type | New value |
  |---|---|---|
  | `@` | `A` | `216.24.57.1` |
  | `www` | `CNAME` | The hostname assigned to the Render service, without `https://` |

  No apex AAAA record was returned during the check. Preserve email MX/TXT records and add the exact
  Resend verification records supplied for the sending domain. Registering the apex on Render also
  configures the www redirect. See [Render DNS](https://render.com/docs/configure-other-dns) and
  [custom domains](https://render.com/docs/custom-domains).
- Verify DNS and TLS in Render, set `APP_ORIGIN=https://lumischool.ai` once the domain is confirmed and
  routed, then verify homepage, health, real signup/email, child-view access and production dev-route
  rejection. An email delivery check needs the intended recipient address.

No Render service, DNS record or email provider configuration was changed during this readiness check.

## Production database verification

Project `winter-glitter-88385847`, branch `production` (`br-red-night-b4apoq97`), database `neondb`,
Postgres 18.6. The database was empty before applying `0000_initial`. The restricted `lumischool_app`
login was provisioned by SQL with a generated password, then the standard migration runner applied
the baseline. A second run was a no-op, and the ledger hash matched the SQL file:
`83283920566b5f54f4f8e769918eb24e33df4743cd3c0815ef7ea15aab0504f4`.

Verified directly: the owner has `BYPASSRLS`; the app role has no superuser, bypass, role-creation or
database-creation privileges; all seven tables belong to the owner and force RLS. The app connects
through the pooled endpoint. Transactional family creation, cross-family read/write denial, scope
cleanup, auth functions and append-only grants passed. Verification writes were rolled back and all
seven application tables remain empty.

The direct owner and pooled app connection strings are in the ignored, owner-readable-only
`.env.production.local`. Configure Render's `DATABASE_URL` and `APP_DATABASE_URL` from those values;
this database migration did not configure Render secrets or deploy the application. The baseline is
now deployed and immutable; every subsequent change must be a new forward migration.

## Current repository readiness

The build/start scripts, Node 24 pin, production configuration, Resend transport, static serving,
Render port handling and configurable client-address header are implemented. Database seeds have been removed; signup and normal use create application data. The initial
commit sequence includes these implementations. Historical implementation steps below describe
the original plan, not missing code.

The root `render.yaml` is present and validates successfully; cloud deployment remains pending. It includes `RESEND_FROM`,
which production startup requires. Neon SQL role attributes and the deployed baseline were verified
as recorded above. Render must use Ohio beside the existing Neon project. Publishing the release,
cloud setup, public origin and verified email sender remain deployment
steps.


How it was done: galleo's `render.yaml`, its package scripts, its database client, its mail sender and its hosting and compliance documents were read in full, both CLIs were queried read-only, and Neon's documentation was read for the role model that db.md left open. No cloud resource was created or changed, and no file in either repository was touched. The drafts this document was folded from are in the session's scratch folder and are superseded by it.

Reread on 22 September 2026: both CLIs were queried read-only again, the Neon project the console had made was read in full, and the Blueprint below was revalidated with `render blueprints validate`. Nothing was created or changed on either account, and the one command that was refused is recorded under "What already exists". The facts that moved are the Neon project's existence, its region and its Postgres major, and the names of its role and database; the code changes are as they were.

## The short version

- galleo is one Render web service in Oregon on the `starter` plan, Node pinned by `.node-version`, migrations run at the end of the build, the frontend served from the same Node process, secrets set in the dashboard, and one Neon project in the same region with one role and no branches per pull request. We do the same, with two database roles instead of one because every table forces row-level security, and with the two regions still to be brought together, since the Neon project was made in AWS Ohio rather than AWS Oregon.
- Both CLIs are signed in. A Render project named `lumischool` with a `Production` environment already exists and holds no service. A Neon project named `lumischool` exists, id `winter-glitter-88385847`, on Postgres 18 in `aws-us-east-2`, with its `production` branch, Neon's default role `neondb_owner` and database `neondb`, and nothing written to it. The git remote exists and has no commit.
- Nothing could be deployed until the build no longer reached into `.scratchpad/`, which is gitignored: the apps imported the drawings through the `scratchpad:art` seam, and the pack was compiled by a script that lived there. That blocker cleared on 22 September 2026 (code change 1); the rest is a day's work.
- Before that, the server needs a production configuration, an email transport, static serving of the built apps, a trusted client-address header, `build` and `start` scripts, and a Node pin.
- Neon's documentation says the owner role carries `BYPASSRLS`, which would settle db.md's open question in the direction the migration needs, and the query in step 5 below is still the confirmation: it has not been run against this project, because reading a connection string asked to sign in again. The app role must be created by SQL and never through Neon's console or CLI, or it would carry `BYPASSRLS` too and the migration would refuse to finish.

## What galleo does

Read on 21 September 2026 from its repository and its live services.

| Piece | galleo | lumischool follows it |
|---|---|---|
| Render service | `galleo`, web, runtime node, region `oregon`, branch `main`, auto-deploy on commit, previews off, health `/health` | Yes, with health at `/api/health`, and region `ohio` to sit beside the Neon project |
| Plan | `starter` live; the committed file says `free` and is behind the dashboard | `starter` in the file from day one |
| Build | `pnpm install --frozen-lockfile && pnpm build && pnpm db:migrate` | `npm ci --include=dev && npm run build && npm run pack && npm run db:migrate` |
| Migrations | At the end of the build, so a failed migration fails the build and the old deploy stays live; not `preDeployCommand` | The same, switchable with one key |
| Start | `pnpm start`, which is `NODE_ENV=production tsx services/server.ts`; binds `PORT ?? API_PORT ?? 8601` and Render injects `PORT=10000`; drains on SIGTERM | `npm start`, binding `PORT ?? API_PORT ?? 8501` |
| Node | `.node-version` holds `22`; pnpm through `packageManager` | `.node-version` holds `24`; npm |
| Frontend | The same process serves `./dist` after the `/api/*` routers, gated on production; one origin, no CORS, same-site cookies | The same, through `server/pages.ts` |
| Env in the file | `NODE_ENV=production` as a value, `SESSION_SECRET` generated, everything else `sync: false` and typed into the dashboard | The same shape |
| Cookies | `galleo_session`, HttpOnly, SameSite=Lax, Secure in production, no `__Host-` | `__Host-ls_*` with Secure, which the API already does when `secure` is true |
| Email | Resend through `fetch`, a constant From on the apex, a warning at boot without a key | Resend, with the server refusing to start without a key |
| Client address | The `CLIENT_IP_HEADER` header, default `cf-connecting-ip`, never `x-forwarded-for` | The same, verified by the forged-header test below |
| Neon | Project `galleo`, `aws-us-west-2`, Postgres 18, one role `neondb_owner`, one database `neondb`, default branch `production`, snapshot branches by hand before risky data work | Project `lumischool`, `aws-us-east-2`, Postgres 18, the same default names, two roles, one branch |
| Neon connection | The direct string on one instance, `prepare: false` set anyway, `sslmode=require` | Direct for the owner, pooled for the app role |
| CI | GitHub Actions runs the checks; Render deploys on push | None yet; optional for the first deploy |

## What already exists

- Render: `render whoami` answers Naib Baghirov, in the one workspace `Naib's workspace` (`tea-d9an6ofavr4c73alddjg`), which is where galleo deploys. A project `lumischool` (`prj-daojrs8ae00c73cqdpug`) with one environment `Production` (`evm-daojrs8ae00c73cqdpv0`) was created on 21 September 2026 and holds no service, no environment group and no database. `render services` lists exactly one service across the whole workspace, `galleo` (`srv-d9ao36t8nd3s739f1bug`), so nothing of lumischool's runs yet. The workspace also holds an empty project `FlowMaestro`, which is nothing to do with this.
- Render CLI 2.21.0 exposes `services create` and `services update`, alongside reads, deploys and Blueprint validation. The `blueprints` command only validates files; initial Blueprint connection uses the dashboard.
- Neon: `neonctl me` answers the same account, on the `free` plan, in one organization, `Galleo` (`org-square-breeze-14805789`). It holds two projects, `galleo` (`muddy-mountain-43298094`) and `lumischool` (`winter-glitter-88385847`). The lumischool project was made in the console on 22 September 2026 and is read out in full in the Neon section below. The installed CLI at 2.31.1 cannot pin a Postgres major on `projects create`, which is why the console made the project and why its major is 18 rather than the 17 the draft asked for; a newer CLI can, and the section on it comes after the Neon steps.
- One read was refused. `neonctl connection-string` asked to sign in again in a browser, on scopes the cached credentials do not carry, and timed out after sixty seconds; it was not completed, so no connection string was read and the role-attribute query in step 5 has not been run. Every other read, `me`, `orgs`, `projects`, `branches`, `roles`, `databases` and the endpoints API, answered from the cached credentials. The owner will meet the same browser prompt once, on whichever command first needs the wider scope.
- Git: the remote is `git@github.com:nbaghiro/lumischool.git`; `main` is published. Push the final release and blueprint changes before deployment.

## What the code needs first

In the order that unblocks the build. Each names where; none is the code.

1. A build with no `.scratchpad/`. Done for the apps and the pack on 22 September 2026. `vite.config.ts` aliased `scratchpad:*` to `.scratchpad/src/bridge/`, which 19 files under `apps/`, `engine/` and `school/` imported through the seam, and `tools/pack.ts` compiled the curriculum by running `.scratchpad/scripts/pack-work.ts`, which imported the notation engine from there, so a clean clone failed both. The decided shape resolved it: the drawings moved into `engine/parts/`, the engine into `engine/notation/`, the site's sample child onto the moved modules, and the seam, the alias and the bridge folder are gone. `npm run build` and `npm run pack` pass on a checkout without `.scratchpad/`, and `check:boundaries` refuses any scratchpad import, by alias or by path.

   The build and pack use root modules only; no scratchpad or seed worker is required.

2. Scripts and the Node pin. Add `build` as `VITE_CONFIG_NATIVE_IGNORE_WARNING=true vite build`, the flag `dev:web` already sets, and `start` as `node --import ./tools/scripts/resolve.ts server/http.ts`, with `LUMISCHOOL_ENV` coming from the environment rather than the script, so `dev:api` keeps its inline `local`. Add `.node-version` with `24`: the root needs `import.meta.main`, `module.registerHooks` and unflagged type stripping, the laptop runs 25 which Render does not list, and Render's default for new services is 24. The build installs devDependencies on purpose, since `NODE_ENV=production` makes `npm ci` skip them and the build needs Vite and `@resvg/resvg-js`. `drizzle-kit` is not needed at deploy time. Add `PORT`, `CLIENT_IP_HEADER` and `RESEND_API_KEY` to local.md's table and to `.env.example`.

3. A production configuration. `configFrom` in `server/http.ts` returns a problem for anything but `LUMISCHOOL_ENV=local`, and `server/__tests__/config.test.ts` asserts it. For `production`: `secure: true`, so the `__Host-` names and `Secure` are used; `origins` holds `APP_ORIGIN` alone, required and required to start with `https://`, with no scratchpad origin; `AUTH_PEPPER` required and refused when it equals the local pepper or is short; the host defaults to `0.0.0.0` with no loopback rule, since Render routes there; the port reads `PORT` before `API_PORT`; the transport is Resend; and there is no dev code at all, not merely none in the environment. The `local` routes already answer 404 elsewhere. Tests for each refusal and for `PORT` winning.

4. A Resend transport. Beside `consoleTransport` in `server/email.ts`, one that posts to Resend with the key, a constant From, a text body, and throws with the status and Resend's text on anything but 2xx, as galleo's sender does. No email names a child, which the existing test keeps. galleo's lesson: under a strict DMARC policy the From must be on the domain whose DKIM key Resend signs, which is the apex for galleo, while auth.md planned a sending subdomain; the verified domain decides, and it is decision 7. Production should refuse to start without the key rather than print codes to Render's log, since the emailed code is the only way in.

5. The built apps from the Node process. Not built, as api.md's last section says: the server answers `/api/*` and a JSON 404 for the rest. galleo serves its build from the same process after the API routes, and auth.md's "Hosts" chose one origin for the same reasons, so the recommendation is the same and no Render static site. A new `server/static.ts`, used after the route table misses and only in production, answers page requests with the right app's `index.html` by `isPage`, `pageFor`, `hasSession` and `hasKidSession` from `server/pages.ts`, which was written for this; serves `/assets/*` with a long immutable cache and the brand files at the root with a short one; sends HTML with `no-store`, `nosniff` and a content security policy per app modelled on the API's own header; and never answers a dotted path outside `dist/` or anything under `/api/`. `boundaries.ts` needs no change unless a package is added. A smoke test against `npm start` with a built `dist/` can wait. Update api.md and local.md in the same change. The visitor's pack and the site's data are files under `dist/assets/`, so the long immutable cache the assets get covers them; nothing of the site's needs a route.

6. The client's address behind the proxy. `answer` passes the socket's peer address, which on Render is the load balancer, so every family would share one network and its twenty codes an hour. auth.md's "Rate limits" already specifies the fix: one function reads the header named by `CLIENT_IP_HEADER` in production, never `x-forwarded-for` as a whole since Render appends to a client's value rather than replacing it, groups IPv6 by its /64, and the socket address is used locally. `Config` gains the header name, null in `local` so the loopback checks keep working. Which header is right is settled by the live test below, not assumed.

7. The health check and a sleeping compute. `/api/health` gives Postgres one second. Neon's free compute suspends after five minutes idle and can take longer than that to wake, so Render's first probe after an idle spell can fail, and repeated failures restart the service. Raise the wait in production, or tell a wake from an outage, or pay for a longer suspend timeout. A first-week decision, not a blocker.

8. The pack in the build. `tools/pack.ts` compiles in process from `engine/notation/` since 22 September 2026, with no scratchpad worker. `vite build` empties `dist/` and `tools/pack.ts` writes to `dist/pack`, so `pack` runs after `build`, or the pack gets a folder of its own through `PACK_DIR`. The watcher is idle on Render since a new pack arrives with a deploy. The pack script throws on a curriculum error, so a red deploy can be content rather than code, which is intended and worth knowing.

9. The curriculum is shipped in the compiled pack. Signup does not require a database catalogue import. There is no seed deployment step.

10. Small things. The request log prints method, path, status and time and never an address or a code, and the console transport must not be the production one. There is no CI workflow; `autoDeployTrigger: checksPass` needs one to wait for.

## Neon, step by step

Steps 1 to 6 are complete, with the production verification above, and the ids are written out rather than left as placeholders: the organization is `org-square-breeze-14805789` and the project is `winter-glitter-88385847`.

1. Confirm the organization and what is in it, read-only:

```
neonctl me
neonctl projects list --org-id org-square-breeze-14805789
```

2. Done on 22 September 2026, in Neon's console rather than by either command the draft held, so the project carries Neon's default names and not this document's. What exists: project `lumischool`, id `winter-glitter-88385847`, in the organization `org-square-breeze-14805789`, region `aws-us-east-2`, Postgres 18, six hours of history retention, one branch `production` (`br-red-night-b4apoq97`, primary and default, unprotected), one database `neondb` owned by `neondb_owner`, one role `neondb_owner`, and one read-write endpoint `ep-falling-fire-b4jd50rg` on the proxy host `c-6.us-east-2.aws.neon.tech` autoscaling between 0.25 and 2 compute units with Neon's default suspend timeout. Nothing has been written to it: the branch reports no logical size, no compute seconds and no written bytes.

   Two facts differed from the draft, and each was a decision rather than a slip. The major was 18 where the draft had asked for 17 to match `docker-compose.yml`; `docker-compose.yml` now pins 18 instead (decision 6, resolved 22 September 2026). The region is AWS Ohio, while galleo's Neon project and galleo's Render service are both in the US West pair, so a server in `oregon` would cross the country for every query and the Render service belongs in `ohio` instead (decision 2). Neither the major nor the region can be changed on a project that exists; both mean making the project again, which costs nothing while the database is empty. The installed CLI cannot pin the major on `projects create`, so a remake goes through the API:

```
neonctl api /projects -X POST -d '{"project":{"name":"lumischool","org_id":"org-square-breeze-14805789","region_id":"aws-us-west-2","pg_version":17,"branch":{"name":"production"}}}'
```

   The output prints the owner's connection string once, and it goes nowhere but the Render dashboard. The draft named the owner `lumischool_owner` and the database `lumischool`; the console's `neondb_owner` and `neondb` are what galleo has, the names appear only in the two connection strings, and the rest of this document now uses them.

3. Read the project back, which was done on 22 September 2026 and gave the shape above. `projects list` asks which organization to use when `--org-id` is left off, so pass it:

```
neonctl projects list --org-id org-square-breeze-14805789
neonctl branches list --project-id winter-glitter-88385847
neonctl roles list --project-id winter-glitter-88385847
neonctl databases list --project-id winter-glitter-88385847
```

   One branch `production`, one role `neondb_owner`, one database `neondb`, which is what they answer. Worth knowing for step 4: `roles list` reads Neon's own register of roles and not `pg_roles`, so a role created by SQL, which `lumischool_app` has to be, never appears in it, and after step 4 the only way to see the app role is the query at the end of step 5.

4. Create the app role by SQL, as `local-roles.sql` does locally, with a hex password so nothing needs escaping in a URL. Never with `neonctl roles create`: a role made through the console, the CLI or the API is a member of `neon_superuser` and carries `BYPASSRLS`, the migration's closing block would raise, and the owner may lack the right to take the attribute away. A role made by SQL has only public privileges and the owner holds admin on it.

```
openssl rand -hex 24
neonctl psql --project-id winter-glitter-88385847 --database-name neondb -- -v ON_ERROR_STOP=1 -c "CREATE ROLE lumischool_app LOGIN PASSWORD '<the hex>' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;"
```

Never run `local-roles.sql` against Neon: it sets the password to `lumischool_app`.

Provision the app role before running migrations. The baseline grants its privileges but does not create roles or set environment-specific passwords.

5. Apply the migrations from the laptop against the owner's direct string, so the schema and the grants exist before Render starts the server and the build's `db:migrate` finds nothing pending:

```
neonctl connection-string --project-id winter-glitter-88385847 --role-name neondb_owner --database-name neondb
DATABASE_URL='<that string>' npm run db:migrate
```

`connection-string` needs a wider scope than the reads above and sends you to a browser to sign in again, once, before it answers.

The run applies the single baseline. If the role invariant fails, stop and inspect the role configuration before retrying. Confirm attributes with a read-only query:

```
neonctl psql --project-id winter-glitter-88385847 --database-name neondb -- -c "select rolname, rolsuper, rolbypassrls, rolcreaterole from pg_roles where rolname in ('neondb_owner','lumischool_app','neon_superuser') order by 1;"
```

Verified on 23 September 2026: `neondb_owner` is a non-superuser with `BYPASSRLS` and `CREATEROLE`; `lumischool_app` has neither attribute. All migration SQL ran successfully without a superuser or an extension. Role provisioning is separate from schema history. The pooled application connection passed transaction-local scope and isolation checks.

6. The two connection strings for Render. The pooled host carries `-pooler`; both end in `sslmode=require`, and a newer string's `channel_binding` is ignored by the driver.

```
neonctl connection-string --project-id winter-glitter-88385847 --role-name neondb_owner --database-name neondb
neonctl connection-string --project-id winter-glitter-88385847 --role-name neondb_owner --database-name neondb --pooled
```

The hosts for this project are `ep-falling-fire-b4jd50rg.c-6.us-east-2.aws.neon.tech` and the same name with `-pooler` before the first dot.

The CLI knows only the owner's password, so for the app role take the pooled string and replace the owner's `user:password` with `lumischool_app` and the hex from step 4.

| Variable | Endpoint | Role | Used by |
|---|---|---|---|
| `DATABASE_URL` | direct | `neondb_owner` | `db:migrate` in the build, the catalogue write |
| `APP_DATABASE_URL` | pooled | `lumischool_app` | `withFamily`, every request, the health check |

galleo runs its single instance on the direct string. lumischool's client was written for a pooler, and the pooler keeps a restart or a second instance from exhausting the compute's connections, so pooled is the recommendation for the app role; direct works and is a one-string change.

7. Optional, as galleo does before risky data work, a snapshot branch before the first real families and before a risky data migration:

```
neonctl branches create --project-id winter-glitter-88385847 --name pre-launch-2026-09-XX --no-compute
```

The free plan keeps six hours of history for a point-in-time restore; a snapshot branch is the durable alternative.

## The Neon CLI, `neon.ts` and the agent tooling

Read on 22 September 2026, from Neon's documentation and from the installed CLI itself, because Neon's onboarding for this project prints a flow (`npm i -g neon@latest`, then `neon skills -y`, `neon mcp -y`, `neon link --project-id winter-glitter-88385847 --branch production -y`, `neon config init`, a `neon.ts` holding `defineConfig({})` from `@neon/config/v1`, then `neon deploy`) that reads like a second tool wanting to own the schema. It is not one, and the part of it that matters here is the upgrade.

There is one Neon CLI under two names, and what is installed is already it. `neon` and `neonctl` on this laptop are both symlinks to the same file, from the npm package `neon` at 2.31.1 installed globally under `/opt/homebrew`. npm's current is 5.0.1 for both names, where `neonctl` is now a compatibility package that depends on `neon`; neither is marked deprecated, and Neon's changelog says the rename needs no migration and no re-authentication. So the pasted flow is not a different tool, it is this tool three majors on. Against the earlier reading of its help, 2.31.1 already has `link`, `checkout`, `init`, `bootstrap`, `config` with `init`, `plan`, `apply` and `status`, `deploy`, `env`, `data-api`, `functions`, `dev` and `buckets`, and it bundles `@neon/config` 0.9.2, which does export `./v1`. What it lacks is `skills`, `mcp`, `diff`, `snapshots` and `inspect`, so of the pasted flow only the two agent-tooling commands would fail today.

`neon deploy` does not touch the schema. It is an alias for `neon config apply`, and what it applies is the `neon.ts` policy: which Neon services the project has (Neon Auth, the Data API, the AI gateway), the Neon Functions, buckets, triggers and custom domains it declares, and per-branch compute tuning such as the autoscaling range, the suspend timeout and a branch time to live. Neon's backend overview says it plainly, that schema, migrations and route handlers are standard application code, and Neon's own walkthrough of `neon.ts` runs a separate `drizzle-kit migrate` after `neon deploy`. There is no declarative schema differ in it, so there is nothing for it to drop and nothing to be careful about: the forced row-level security, the policies generated from `server/db/scope.ts`, the security-definer functions with their grants and revokes, the two deferred constraint triggers, the role attributes, the generated `content.hash`, the check constraints on the timestamps and the closing `DO` block that refuses to finish all stay where they are, applied in file order by `server/db/migrations/migrate.ts` on drizzle's migrator. It reads and writes nothing in the `drizzle` schema either, so it cannot disagree with our ledger. `neon config plan` is its dry run and changes nothing.

The recommendation is to upgrade the CLI and to add no `neon.ts`. Upgrading has no decision in it and buys three things we would otherwise work around: `projects create --pg-version` pins a major, which step 2 above wanted and had to reach the raw API for; `neon diff` shows the schema difference between two branches from `pg_dump --schema-only` and applies nothing, which is a review aid; and `neon snapshots` is the tidier form of the snapshot branch in step 7. Adopting `neon.ts` would buy nothing, because every key in it names a Neon service we do not use, and two of them cut across the database's whole design. `dataApi: true` provisions `authenticated` and `anonymous` roles through Neon, so both are Neon's own roles rather than SQL-made ones, and grants `authenticated` select, insert, update and delete on every table in `public` with default privileges to match, which is the blanket reach across every family's rows that the two-role split exists to prevent. `auth: true` creates and maintains its own tables in a `neon_auth` schema, where auth.md's sign-in is ours and lives in the seven tables. A `neon.ts` that declares neither of them is `defineConfig({})`, an empty policy, for two new dependencies and a file nobody reads. If one is ever added, it says `auth: false` and `dataApi: false` in as many words rather than leaving them out.

The other three commands write into the working copy by default, which is the second reason to leave the flow alone. `neon link` writes a `.neon` file holding the organization, project and branch ids, adds it to `.gitignore` itself and keeps no token in it, and then pulls the branch's variables into a local `.env`, which would put the production owner's connection string on the laptop; `--no-env-pull` turns that off. `neon skills` writes Neon's agent skill files into the current directory unless `--global` is passed, and structure.md has no place for them at the root. `neon mcp` writes an MCP server entry into each agent's configuration and, unless `--oauth` is passed, mints a Neon API key and writes that into the configuration too.

The MCP server is not connected to this project. Neon's documentation recommends it for development and testing rather than production, and says never to connect an agent to a production database; its querying category runs statements and applies schema changes on a temporary branch, and its branch and project categories create and delete. lumischool's rule is that the only path from a child's record to a model is `school/assistant/envelope.ts`, and an MCP server holding a credential for the production branch is a second one. If it is ever wanted for a schema question, it is against a branch made for the purpose, with `--oauth`, `--read-only` and `--project-id`, and never against `production`.

## Render, step by step

The order is galleo's first-deploy runbook: Neon first, then the code on `main`, then the Blueprint.

1. Land the code changes above, and the Neon steps, and keep the two connection strings at hand.
2. Put the Blueprint below at the repository root as `render.yaml` and validate it, read-only, with `render blueprints validate ./render.yaml`. With no commit on `main` the validator answers that the branch cannot be found, and with no service of that name it asks for a `repo` key; every other key passed on 21 September, and again on 22 September with `region: ohio`. So push first, add `repo: https://github.com/nbaghiro/lumischool` for the first validation, and drop it once the service exists, as galleo's file has none.
3. Commit and push `main`. Confirm the GitHub app Render uses for galleo also has access to the lumischool repository.
4. In the dashboard: New, Blueprint, connect the repository on `main`. Render reads the file and shows one web service. Put it in the project `lumischool` and its `Production` environment, or move it there afterwards from the project page.
5. Fill the values marked `sync: false` when prompted: `DATABASE_URL` with the direct owner string, `APP_DATABASE_URL` with the pooled app-role string, `APP_ORIGIN` with `https://lumischool.onrender.com` for the first deploy, compared byte for byte with the browser's `Origin` so no trailing slash and no `www`, and `RESEND_API_KEY` with the key for the sending domain. `AUTH_PEPPER` is generated by Render and never set by hand; rotating it voids every code and PIN hash.
6. Apply. The first deploy installs, builds, packs, migrates, which is a no-op after step 5 of the Neon section, starts, and probes `/api/health`. Watch the log.

## After the first deploy

With `HOST` as the service's host.

1. Health, and that the app role answers: `curl -si https://HOST/api/health` is `200 {"ok":true}`. A 503 saying the database did not answer on the very first call is the compute waking; a second call within a few seconds must be 200.
2. The pages: `/` is the site's HTML with a content security policy header, `/kids` is the children's view, `/home` is the site, `/api/nothing` is a JSON 404 and not HTML, and a file under `/assets/` answers with a long cache header.
3. Cookies over HTTPS. A code request with the right origin answers 202 and sets `__Host-ls_pending` with `Path=/`, `HttpOnly`, `SameSite=Lax`, `Secure` and a fifteen-minute age:

```
curl -si -X POST https://HOST/api/auth/email/start -H 'origin: https://HOST' -H 'content-type: application/json' -d '{"email":"you@your-domain"}'
```

Then sign in end to end in a browser and check that the session cookie is `__Host-ls_session`, Secure, HttpOnly, SameSite=Lax, with no Domain.

4. The origin check. The same POST with a foreign origin, and again with none, both answer `403 {"error":"origin"}`, and an `OPTIONS` adds no allow-origin header in production.
5. The local routes are gone: `/api/dev/outbox` is a 404, `/outbox` is the app's missing page, and the fixed code is refused at the code step.
6. The forged client-address test that auth.md's "Rate limits" asks for. The network limit is twenty unused codes an hour from one network. From one machine, before the Resend key is set so nothing is delivered, send twenty-one requests, each to a different address on a domain you control and each with forged headers naming a different address:

```
for n in $(seq 1 21); do curl -s -o /dev/null -w '%{http_code}\n' -X POST https://HOST/api/auth/email/start -H 'origin: https://HOST' -H 'content-type: application/json' -H "x-forwarded-for: 198.51.100.$n" -H "cf-connecting-ip: 203.0.113.$n" -H "true-client-ip: 203.0.113.$n" -d "{\"email\":\"probe$n@your-domain\"}"; done
```

Expected: 202 twenty times, then 429, which shows the forged values were ignored and all twenty-one counted against the one real network. A 202 on the twenty-first means the trusted header is client-settable on Render: change `CLIENT_IP_HEADER` per decision 5 and run it again. Those twenty unused codes then count against that network for an hour.

7. `render logs --resources <service id> --limit 50` shows the request lines and the line the server prints on start, and no line prints an address or a code once the transport is Resend.
8. Email: with the key set, ask for a code to a real address and check that it arrives from the fixed From with DKIM aligned, which Resend's domain page shows the records for.

Custom domain, as galleo's: the service's settings, add the apex and `www`, an ALIAS or Render's A record at the apex and a CNAME for `www`, Render issues TLS and redirects `www`. When it resolves, change `APP_ORIGIN` to the domain, which restarts the service. Everything is one origin, so there is no DNS per path. Rollback is the dashboard's rollback to the previous successful deploy; the migrations are forward-only, and a rollback across a schema change is not covered.

## The Blueprint

Validated on 21 September 2026 and again on 22 September 2026, the second time with `region: ohio`, which the validator accepts as it rejects a region that does not exist. Both runs answer with the one error the missing commit causes, `branch main could not be found`, and no other. It goes to the repository root as `render.yaml` when the code changes have landed.

```yaml
# Render Blueprint for lumischool. One web service (Node) runs server/http.ts, which serves the built
# apps AND /api on one origin (see .docs/auth.md, "Hosts"). Postgres is Neon (external); set
# DATABASE_URL and APP_DATABASE_URL in the dashboard.
services:
    - type: web
      name: lumischool
      runtime: node
      region: ohio # sits with the Neon project's aws-us-east-2; galleo's pair is oregon and aws-us-west-2
      plan: starter # `free` spins down after 15 min idle and silently drops preDeployCommand; `standard` (2 GB) if the build OOMs
      branch: main
      autoDeployTrigger: commit
      # Migrations run at the END of the build (&&: a failed build never reaches them; a failed
      # migration fails the build, so the old deploy stays live). galleo keeps them here on the same
      # plan; preDeployCommand is the alternative once the plan is settled (.docs/db.md).
      # `--include=dev`: NODE_ENV=production below makes `npm ci` skip devDependencies, and the build
      # needs vite and @resvg/resvg-js (tools/brand.ts) from there. `pack` runs AFTER `build`, since
      # `vite build` empties dist/ and the pack is written under dist/pack.
      buildCommand: npm ci --include=dev && npm run build && npm run pack && npm run db:migrate
      startCommand: npm start # node --import ./tools/scripts/resolve.ts server/http.ts, with LUMISCHOOL_ENV from the env below
      healthCheckPath: /api/health
      envVars:
          - key: NODE_ENV
            value: production
          - key: LUMISCHOOL_ENV # configFrom: secure cookies, the real origin, a required pepper, no dev code
            value: production
          - key: API_HOST # Render routes to 0.0.0.0; PORT (10000) is injected by Render and read before API_PORT
            value: 0.0.0.0
          - key: AUTH_PEPPER
            generateValue: true # Render mints a strong secret once; rotating it voids every code and PIN hash
          - key: DB_CONNECT_TIMEOUT # seconds; long enough for a suspended Neon compute to wake
            value: "15"
          - key: DB_STATEMENT_TIMEOUT # milliseconds, set per transaction by withFamily
            value: "10000"
          - key: PACK_DIR # where `npm run pack` wrote, relative to the repo root Render runs from
            value: dist/pack
          - key: CLIENT_IP_HEADER # the trusted proxy header for the network limits; verified by the forged-header test
            value: cf-connecting-ip
          # --- secrets: set in the Render dashboard (never committed) ---
          - key: DATABASE_URL # Neon DIRECT connection string, the owner role: migrations and the catalogue only
            sync: false
          - key: APP_DATABASE_URL # Neon POOLED connection string, role lumischool_app (NOBYPASSRLS): what answers requests
            sync: false
          - key: APP_ORIGIN # the public origin, e.g. https://lumischool.onrender.com, then the custom domain
            sync: false
          - key: RESEND_API_KEY # sign-in codes and every other email
            sync: false
          - key: RESEND_FROM # verified sending address; required at startup
            sync: false
```

## Open decisions

Each with what galleo does and the recommendation.

1. How the build gets the drawings and the notation engine. Decided by the moves (22 September 2026): the drawings are in `engine/parts/` and the engine in `engine/notation/`, and the seam is gone, so there is no interim pack or vendored bridge. The choice had been to finish the moves and deploy after, or for the interim commit a pack built on the laptop with `PACK_DIR` pointing at it and vendor the two bridge files under the seam, deleting both when the moves land, and not to un-ignore `.scratchpad/`, which would put every prototype in the build.
2. Region and plan. galleo is Render `oregon` and Neon `aws-us-west-2`, `starter` and Neon free. Render's free plan spins down after fifteen minutes and takes about a minute to wake, which a child opening the app in the morning would meet first, so `starter` from the first deploy; Neon free until there are families. The plan half is settled and the region half moved on 22 September 2026: the Neon project was made in `aws-us-east-2`, which is AWS Ohio, so a Render service in `oregon` would cross the country for every query. Two ways to close it. Put the Render service in `ohio`, which is one word in the Blueprint, validated, and leaves lumischool in a different pair from galleo. Or remake the Neon project in `aws-us-west-2` and keep `oregon`, which is free while the database is empty and keeps both products together. `ohio` is the recommendation, because the pairing with galleo buys nothing on its own and remaking the project costs a step that can go wrong; it stops being free the moment a family's rows exist. If the first families are in Europe, `frankfurt` and `aws-eu-central-1` halve every round trip and cannot be changed later without moving the data.
3. The domain. auth.md uses `lumischool.ai`. Confirm it, since `APP_ORIGIN`, the Resend sending domain and the From, and the passkey relying-party id when passkeys arrive all follow it and the last should be final.
4. Branches for previews. galleo has previews off and makes snapshot branches by hand. Per-PR previews need Render's paid workspace and Neon's GitHub integration. The same as galleo, with at most one persistent staging branch and a free Render service tracking a staging git branch if a second environment is wanted before launch. Every branch inherits the roles and grants as a copy, and the app role's password is the same across them.
5. The client-address header. Render's documentation says read `x-forwarded-for`, but Render appends to a client's value, and Cloudflare in front of every Render service documents `cf-connecting-ip` as overwritten. galleo trusts that header on the strength of a comment, and auth.md could not confirm it, which is why the live test exists. `cf-connecting-ip` as drafted, configurable, and the fallback if the test fails is the second-from-the-right entry of `x-forwarded-for`, exact only while exactly two proxies sit in front.
6. Postgres major and names. Local Docker uses Postgres 18. Neon uses database `neondb` and owner `neondb_owner`. The local reset applies the same migration files without adding application data.
7. Email. Which domain is verified in Resend and what the From is, given galleo's DMARC lesson. And whether production refuses to start without the key, which is recommended, or warns as galleo does.
8. Pooled or direct for the app role. Pooled recommended; a one-string change either way.
9. The health check against a sleeping compute. Raise the wait in production, answer 200 on a wake in progress, or pay for a longer suspend timeout. First week.
10. No catalogue seed is required: curriculum comes from the compiled pack.
11. Migrations in the build or as `preDeployCommand`. galleo keeps them in the build; the file switches with one key.
12. CI and the deploy trigger. `autoDeploy: true` is the deprecated spelling of `autoDeployTrigger: commit`; `checksPass` needs a workflow. Optional for the first deploy.
13. The subprocessor list. galleo's compliance document names its providers. lumischool's rule is that no third party sees a child's data; Render and Neon will hold the family's rows and Resend the adults' addresses, so the privacy text names those three and no more.
14. The Neon CLI, `neon.ts` and the agent tooling, per the section above. Upgrade the CLI with `npm i -g neon@latest`, add no `neon.ts`, and do not connect the MCP server to this project. If Neon's agent skills are wanted, `neon skills --global` keeps them out of the repository. The recommendation stands on Neon's own documentation and not on a trial: nothing has been run.
15. Migrations: decided. Keep Drizzle and forward-only corrective migrations, following galleo. The pre-launch schema is consolidated into `0000_initial.sql`, including child-login constraints and functions. Provision the app role separately before applying it. See [migrations.md](migrations.md) for the complete workflow and local replay tests.

## Order of work

- [ ] Decide items 2, 3, 7 and 14 above, since the region, the domain and the CLI gate the rest. Items 1 and 6 are decided.
- [x] A build and a pack that pass on a clean clone (code change 1) (22 September 2026).
- [x] The Neon project, its `production` branch, its `neondb` database and its `neondb_owner` role (Neon steps 1 to 3) (22 September 2026).
- [ ] `npm i -g neon@latest`, which upgrades the CLI in place from 2.31.1 to 5.0.1 (decision 14).
- [x] Production owner and app role attributes verified before and after migration (23 September 2026).
- [x] `build` and `start` scripts, `.node-version`, the env table and `.env.example` (code change 2).
- [x] `configFrom` for production with its tests (code change 3).
- [x] The Resend transport (code change 4).
- [x] The built apps served from the Node process, with api.md and local.md updated (code change 5).
- [x] The trusted client-address header (code change 6).
- [ ] `pack` after `build`, or its own folder (code change 8).
- [x] Decide the four migrations (decision 15), which is only worth doing before the first commit (22 September 2026).
- [x] The first commit and push of `main`.
- [x] Neon steps 4 to 6: app role provisioned, baseline applied and verified, connection strings saved privately (23 September 2026).
- [ ] Publish the updated `render.yaml`; the local file is present and passed Render validation (23 September 2026).
- [ ] The Blueprint applied in the dashboard with the four secrets.
- [ ] The eight checks after the first deploy, the forged-header test included.
- [ ] The custom domain and `APP_ORIGIN` after it.
- [ ] The health-check decision, the catalogue decision, a snapshot branch before the first family, and db.md's open decision written down with the query's result.
