# Migrations

We use Drizzle's normal PostgreSQL migrations, following galleo: numbered SQL files and the generated
`meta/_journal.json` and snapshots in `server/db/migrations/`. Corrections move forward as new migrations.
There are no down migrations and no database seed. Signup and ordinary app use create application data;
the curriculum is supplied by the compiled pack.

## Add a schema change

1. Edit `server/db/schema.ts`.
2. Run `npm run db:generate -- --name=describe_the_change`.
3. Review the SQL, including preservation of existing rows, constraints, indexes and grants.
4. Run `npm run db:migrate`, then `LUMISCHOOL_REQUIRE_DB=1 npm run check`.
5. Commit the schema, SQL, journal and snapshot together.

For functions, triggers, policies, grants or a data correction, run
`npm run db:generate -- --custom --name=describe_the_change` and write the SQL in the generated file.
Keep `--> statement-breakpoint` between statements. For policy changes also update `server/db/scope.ts`;
`scope.itest.ts` compares the fully migrated policies with that declaration. New tables must have the
required RLS policies and grants in the same migration.

To undo an applied schema change, restore the desired declaration and generate another migration.
To undo applied custom SQL or correct data, add another custom migration. Dropped data is not recovered
by recreating a column or table: preserve it ahead of time or restore from a backup.

## Apply and deploy

`npm run db:migrate` uses the owner's direct `DATABASE_URL`. It holds a PostgreSQL advisory lock while
Drizzle checks its history and applies pending files. Drizzle records them in
`drizzle.__drizzle_migrations`, and applies the pending batch in a transaction. Failure rolls back that
batch; a successful second run has nothing to apply. Keep SQL transactional: commands such as
`CREATE INDEX CONCURRENTLY` cannot run in this batch.

Provision `lumischool_app` before the first migration, with an environment-specific login password and
`NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`. Local `db:up` does this through `local-roles.sql`.
On Neon provision it with SQL, separately from schema history. The owner must have `BYPASSRLS` for the
security-definer functions over tables with forced RLS. Migrations grant the app role its privileges;
the role must own no tables. No Neon-specific migration code or extensions are needed.

On Render run `npm run db:migrate` once the build and pack succeed, before the new application starts,
using Neon's direct owner URL. `APP_DATABASE_URL` is the app role's pooled URL and is used for requests.
The migration lock requires a direct connection. Changes must remain compatible with the old app while
it is still serving: add a new shape first, deploy its users, and remove the old shape in a later deploy.
Never run the local reset script against production.

Drizzle orders pending migrations by journal timestamps and does not validate the hashes of previously
applied SQL. Once a migration has reached a shared environment, keep its SQL and metadata immutable.
Merge migration branches carefully and regenerate unreleased conflicts against the latest history;
`db:check` validates metadata but is not a live schema drift checker. Do not use `drizzle-kit push` as
the deployment workflow.

## Rebuild and verify locally

`npm run db:reset` explicitly targets the local `lumischool-pg` container and local URLs, regardless of
exported database URLs. It drops `public` and `drizzle`, reapplies the migrations, and leaves all seven
application tables empty. Then open `http://localhost:8500/start` and create a family.

The current baseline was consolidated with permission during pre-launch development, including the
child-login schema and security functions. Any database holding an older baseline must be rebuilt
before it can use this history. Once deployed, follow the immutable forward-only rule above.

`test:db` replays the real files into disposable databases. Migration tests cover an empty database
owned by a non-superuser with `BYPASSRLS`, repeated and concurrent runs, upgrades with existing rows,
a corrective migration, and transactional failure followed by a successful retry. Store, isolation
and policy tests run against that migrated schema. These local checks do not verify a live Neon project.

The baseline was deployed to production Neon on 23 September 2026. Its ledger hash, owner/app role
permissions, forced RLS, pooled login and rollback-only isolation checks were verified; all application
tables remained empty. See [deploy.md](deploy.md). The baseline must no longer be edited or consolidated.
