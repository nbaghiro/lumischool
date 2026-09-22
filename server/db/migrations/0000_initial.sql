-- =================================================================================================
-- The one function the tables below need before they exist: `content.hash` is generated from the
-- body, and a generated column may only call immutable functions. Postgres marks `convert_to` stable,
-- because in general an encoding conversion could change; converting a given text to UTF-8 bytes
-- always gives the same bytes, so this wrapper is honest in declaring itself immutable. The value is
-- the same sha256 the corpus reader in server/db/seed/corpus.ts computes over a file's text.
-- =================================================================================================
CREATE FUNCTION utf8_sha256(body text) RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS
$$ SELECT encode(sha256(convert_to(body, 'UTF8')), 'hex') $$;
--> statement-breakpoint

-- Every timestamp is stored as text in one format, ISO 8601 in UTC to the millisecond, so the string
-- in Postgres, on the wire and in a browser's queue is the same one (see .docs/db.md). This renders
-- a timestamptz in that format, for defaults and for comparing against a window. `to_char` is marked
-- stable because some of its patterns depend on the locale; this pattern uses none of them.
CREATE FUNCTION utc_iso(t timestamptz) RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS
$$ SELECT to_char(t AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') $$;
--> statement-breakpoint
CREATE TABLE "content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid,
	"body" text NOT NULL,
	"hash" text GENERATED ALWAYS AS (utf8_sha256(body)) STORED NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "content_family_hash_key" UNIQUE NULLS NOT DISTINCT("family_id","hash")
);
--> statement-breakpoint
ALTER TABLE "content" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"family_id" uuid NOT NULL,
	"kid_id" uuid,
	"kind" text NOT NULL,
	"data" jsonb NOT NULL,
	"actor" uuid,
	"device" uuid NOT NULL,
	"seq" bigint NOT NULL,
	"at" text NOT NULL,
	CONSTRAINT "events_family_device_seq_key" UNIQUE("family_id","device","seq"),
	CONSTRAINT "events_at_is_an_instant" CHECK (at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"time_zone" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "families" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid,
	"kind" text NOT NULL,
	"hash" text NOT NULL,
	"user_id" uuid,
	"kid_id" uuid,
	"email" text,
	"name" text,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"ip" text,
	"seen_at" text,
	"created_at" text DEFAULT utc_iso(now()) NOT NULL,
	CONSTRAINT "keys_hash_key" UNIQUE("hash"),
	CONSTRAINT "keys_family_null_only_before_a_family" CHECK ("keys"."family_id" is not null or "keys"."kind" in ('sign-in', 'confirm')),
	CONSTRAINT "keys_session_names_a_user" CHECK ("keys"."kind" not in ('session', 'shared-session') or ("keys"."user_id" is not null and "keys"."kid_id" is null)),
	CONSTRAINT "keys_kid_session_names_a_kid_and_a_parent" CHECK ("keys"."kind" <> 'kid-session' or ("keys"."kid_id" is not null and "keys"."user_id" is not null)),
	CONSTRAINT "keys_pin_names_no_kid" CHECK ("keys"."kind" <> 'pin' or "keys"."kid_id" is null),
	CONSTRAINT "keys_created_at_is_an_instant" CHECK (created_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'),
	CONSTRAINT "keys_seen_at_is_an_instant" CHECK ("keys"."seen_at" is null or seen_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
ALTER TABLE "keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"grade" integer NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "kids_family_id_id_key" UNIQUE("family_id","id")
);
--> statement-breakpoint
ALTER TABLE "kids" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"kid_id" uuid,
	"from_day" date,
	"to_day" date,
	"ended_at" text,
	CONSTRAINT "members_parent_or_tutor" CHECK (("members"."kid_id" is null and "members"."from_day" is null and "members"."to_day" is null)
             or ("members"."kid_id" is not null and "members"."from_day" is not null and "members"."to_day" is not null and "members"."from_day" <= "members"."to_day")),
	CONSTRAINT "members_ended_at_is_an_instant" CHECK ("members"."ended_at" is null or ended_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$')
);
--> statement-breakpoint
ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"passkeys" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_family_kid_fk" FOREIGN KEY ("family_id","kid_id") REFERENCES "public"."kids"("family_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keys" ADD CONSTRAINT "keys_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keys" ADD CONSTRAINT "keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keys" ADD CONSTRAINT "keys_family_kid_fk" FOREIGN KEY ("family_id","kid_id") REFERENCES "public"."kids"("family_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kids" ADD CONSTRAINT "kids_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_family_kid_fk" FOREIGN KEY ("family_id","kid_id") REFERENCES "public"."kids"("family_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_family_name_idx" ON "content" USING btree ("family_id","name");--> statement-breakpoint
CREATE INDEX "events_family_idx" ON "events" USING btree ("family_id","at");--> statement-breakpoint
CREATE INDEX "events_kid_idx" ON "events" USING btree ("kid_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "keys_pin_key" ON "keys" USING btree ("family_id") WHERE kind = 'pin';--> statement-breakpoint
CREATE INDEX "keys_family_idx" ON "keys" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "keys_email_idx" ON "keys" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "keys_ip_idx" ON "keys" USING btree ("ip","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "members_parent_key" ON "members" USING btree ("user_id","family_id") WHERE kid_id is null;--> statement-breakpoint
CREATE UNIQUE INDEX "members_tutor_key" ON "members" USING btree ("user_id","family_id","kid_id") WHERE kid_id is not null;--> statement-breakpoint
CREATE INDEX "members_family_idx" ON "members" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree (lower("email"));
--> statement-breakpoint
-- =================================================================================================
-- Isolation, and the rules that are about more than one row. Everything from here to the end of the
-- file is hand-written, apart from the policy block, which is generated from server/db/scope.ts. drizzle-kit
-- neither generates nor diffs any of it, because it cannot express `force row level security`, the
-- functions the policies call, security-definer functions or triggers. .docs/db.md explains each
-- piece, and `npm run check:db` fails if a table with `family_id` is left without forced security
-- and a policy.
--
-- This is the one clean initial migration, written 22 September 2026. It supersedes four migrations
-- that stood before it (0000_initial, 0001_sign_in, 0002_kid_sessions, 0003_quick_red_shift), each
-- replaced or followed in turn before the first commit and before anything was deployed, and it holds
-- their net result: the seven tables, sign-in by code, kid sessions in place of tablet pairing (which
-- never shipped), and a grown-up's own settings. No database outside this machine ever held an older
-- version. From the first deploy on, a migration that has left this machine is never edited.
-- =================================================================================================

-- The app role: what the server connects as. Created here without a login when the environment has
-- not made it already, so the grants below always have a role to name; each environment gives it a
-- login (locally, server/db/migrations/local-roles.sql). It owns nothing and never bypasses row-level security, and
-- the last statement of this file refuses to finish if either is untrue.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lumischool_app') THEN
    CREATE ROLE lumischool_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;
--> statement-breakpoint

-- The two settings every policy reads, set for one transaction at a time by `withFamily` in
-- server/db/client.ts. The `nullif` matters: once a session has set a custom setting in any transaction,
-- reading it afterwards returns '' rather than null, and ''::uuid is an error. With nullif a missing
-- setting is null, `family_id = null` matches nothing, and a query with no family set returns nothing
-- rather than failing or returning everything.
CREATE FUNCTION app_family() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.family', true), '')::uuid $$;
--> statement-breakpoint
CREATE FUNCTION app_user() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.user', true), '')::uuid $$;
--> statement-breakpoint

-- ------------------------------------------------------------------------------ policies, generated
-- From server/db/scope.ts. Forced, so they hold even for a table owner that is not a superuser. Each
-- compares a row's family with the setting; `(SELECT app_family())` is evaluated once per statement
-- rather than once per row. The catalogue (content with no family) is readable by every family and
-- writable by none. `users` has no family: a user is readable as oneself or through any membership in
-- the current family, and writable only by oneself.
ALTER TABLE families FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY families_family ON families
  USING (id = (SELECT app_family())) WITH CHECK (id = (SELECT app_family()));
--> statement-breakpoint
ALTER TABLE kids FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY kids_family ON kids
  USING (family_id = (SELECT app_family())) WITH CHECK (family_id = (SELECT app_family()));
--> statement-breakpoint
ALTER TABLE members FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY members_family ON members
  USING (family_id = (SELECT app_family())) WITH CHECK (family_id = (SELECT app_family()));
--> statement-breakpoint
ALTER TABLE keys FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY keys_family ON keys
  USING (family_id = (SELECT app_family())) WITH CHECK (family_id = (SELECT app_family()));
--> statement-breakpoint
ALTER TABLE events FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY events_family ON events
  USING (family_id = (SELECT app_family())) WITH CHECK (family_id = (SELECT app_family()));
--> statement-breakpoint
ALTER TABLE content FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY content_read ON content FOR SELECT
  USING (family_id IS NULL OR family_id = (SELECT app_family()));
--> statement-breakpoint
CREATE POLICY content_insert ON content FOR INSERT
  WITH CHECK (family_id = (SELECT app_family()));
--> statement-breakpoint
CREATE POLICY content_delete ON content FOR DELETE
  USING (family_id = (SELECT app_family()));
--> statement-breakpoint
ALTER TABLE users FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY users_read ON users FOR SELECT
  USING (id = (SELECT app_user())
         OR EXISTS (SELECT 1 FROM members m WHERE m.user_id = users.id AND m.family_id = (SELECT app_family())));
--> statement-breakpoint
CREATE POLICY users_insert ON users FOR INSERT
  WITH CHECK (id = (SELECT app_user()));
--> statement-breakpoint
CREATE POLICY users_update ON users FOR UPDATE
  USING (id = (SELECT app_user())) WITH CHECK (id = (SELECT app_user()));
--> statement-breakpoint
CREATE POLICY users_delete ON users FOR DELETE
  USING (id = (SELECT app_user()));
--> statement-breakpoint
-- ------------------------------------------------------------------------------ end of generated

-- A family always has an active parent (a membership with no kid and no `ended_at`). Two triggers
-- hold it.
--
-- The first refuses, at the statement that tried, the removal that would leave a family with none:
-- deleting the last active parent, ending their membership, or deleting their account (which reaches
-- the membership by cascade). It locks the family row first, so two people removing the last two
-- parents at the same moment are taken one after the other and the second is refused. A family's own
-- deletion goes through, since by then its row is already gone. It runs as the owner, so the rule does
-- not depend on what the caller can see.
CREATE FUNCTION members_keep_a_parent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.kid_id IS NOT NULL OR OLD.ended_at IS NOT NULL THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.kid_id IS NULL AND NEW.ended_at IS NULL AND NEW.family_id = OLD.family_id THEN
    RETURN NULL;
  END IF;
  PERFORM 1 FROM families WHERE id = OLD.family_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM members WHERE family_id = OLD.family_id AND kid_id IS NULL AND ended_at IS NULL) THEN
    RAISE EXCEPTION 'a family must always have at least one parent'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'members_keep_a_parent';
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER members_keep_a_parent AFTER UPDATE OR DELETE ON members
  FOR EACH ROW EXECUTE FUNCTION members_keep_a_parent();
--> statement-breakpoint

-- The second checks at commit, which is what stops a family being created with no parent at all:
-- a transaction that inserts a family and no active parent for it cannot commit.
CREATE FUNCTION families_have_a_parent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  f uuid;
BEGIN
  IF TG_TABLE_NAME = 'families' THEN
    f := NEW.id;
  ELSE
    f := OLD.family_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM families WHERE id = f) THEN
    RETURN NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM members WHERE family_id = f AND kid_id IS NULL AND ended_at IS NULL) THEN
    RAISE EXCEPTION 'a family must always have at least one parent'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'families_have_a_parent';
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER families_have_a_parent AFTER INSERT ON families
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION families_have_a_parent();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER members_leave_a_parent AFTER UPDATE OR DELETE ON members
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION families_have_a_parent();
--> statement-breakpoint

-- Creating a family and its first parent is one call, and the first parent is whoever is signed in.
-- It runs as the caller, under the policies, so it only works inside `withFamily` with the new
-- family's id set, and with no user signed in the membership insert fails.
CREATE FUNCTION create_family(p_id uuid, p_name text, p_time_zone text) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO families (id, name, time_zone) VALUES (p_id, p_name, p_time_zone);
  INSERT INTO members (user_id, family_id) VALUES (app_user(), p_id);
  RETURN p_id;
END
$$;
--> statement-breakpoint

-- ------------------------------------------------------------------------------ keys, before a family
-- Two kinds of key belong to no family while they are in use: a sign-in code and a confirm code (a
-- new address, or a passkey being added). The app role cannot reach a key with no family through any
-- policy, so these functions are the only way to them, each by the hash of a secret the caller holds,
-- and each returns only what the step needs. Expiry is a rule per kind declared once in
-- server/db/keys.ts; the caller passes the earliest `created_at` still alive, so the rule stays in one
-- place and the use stays atomic. The limits are .docs/auth.md's, are counted from these rows rather
-- than a table of counters, and none of them is measured.

-- A sign-in or confirm code, if the limits allow. For an address: one a minute, three in fifteen
-- minutes and ten a day, and none while its codes have had ten wrong guesses in the last hour. For a
-- network: twenty an hour. For everyone: five hundred unused codes and invitations an hour, after which
-- sending stops. Returns false when refused, so the caller answers the same way either way.
CREATE FUNCTION key_issue(p_kind text, p_hash text, p_email text, p_ip text, p_user_id uuid, p_detail jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  addr text := lower(p_email);
BEGIN
  IF p_kind NOT IN ('sign-in', 'confirm') THEN
    RAISE EXCEPTION 'key_issue makes sign-in and confirm codes, not %', p_kind;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('code:' || addr, 0));
  IF EXISTS (SELECT 1 FROM keys WHERE kind IN ('sign-in', 'confirm') AND email = addr AND created_at > utc_iso(now() - interval '1 minute')) THEN
    RETURN false;
  END IF;
  IF (SELECT count(*) FROM keys WHERE kind IN ('sign-in', 'confirm') AND email = addr AND created_at > utc_iso(now() - interval '15 minutes')) >= 3 THEN
    RETURN false;
  END IF;
  IF (SELECT count(*) FROM keys WHERE kind IN ('sign-in', 'confirm') AND email = addr AND created_at > utc_iso(now() - interval '1 day')) >= 10 THEN
    RETURN false;
  END IF;
  IF (SELECT coalesce(sum(attempts), 0) FROM keys WHERE kind IN ('sign-in', 'confirm') AND email = addr AND created_at > utc_iso(now() - interval '1 hour')) >= 10 THEN
    RETURN false;
  END IF;
  IF p_ip IS NOT NULL AND (SELECT count(*) FROM keys WHERE ip = p_ip AND created_at > utc_iso(now() - interval '1 hour')) >= 20 THEN
    RETURN false;
  END IF;
  IF (SELECT count(*) FROM keys WHERE kind IN ('sign-in', 'confirm', 'invite') AND created_at > utc_iso(now() - interval '1 hour')) >= 500 THEN
    RETURN false;
  END IF;
  INSERT INTO keys (kind, hash, email, ip, user_id, detail)
    VALUES (p_kind, p_hash, addr, p_ip, p_user_id, coalesce(p_detail, '{}'::jsonb));
  RETURN true;
END
$$;
--> statement-breakpoint

-- The login for an address, before any family is known. It returns only the id, which the caller
-- keeps on the code it issues, so the answer to the browser is the same whether or not one exists.
CREATE FUNCTION login_by_address(p_email text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS
$$ SELECT id FROM users WHERE lower(email) = lower(trim(p_email)) $$;
--> statement-breakpoint

-- A guess at a sign-in or confirm code, found by the hash of the browser's pending cookie. A right
-- guess marks the code proven and keeps it, so the caller can use it at once or after the person has
-- chosen a family; a wrong one is counted, and after five the code is dead until it expires. The
-- outcome says which of those happened, to a caller who already holds the pending cookie.
CREATE FUNCTION key_prove(p_hash text, p_kind text, p_guess text, p_not_before timestamptz)
RETURNS TABLE (outcome text, attempts_left integer, key_id uuid, key_email text, key_user_id uuid, key_detail jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  r keys;
BEGIN
  IF p_kind NOT IN ('sign-in', 'confirm') THEN
    RAISE EXCEPTION 'key_prove checks sign-in and confirm codes, not %', p_kind;
  END IF;
  SELECT * INTO r FROM keys WHERE hash = p_hash AND kind = p_kind AND family_id IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'unknown'::text, 0, NULL::uuid, NULL::text, NULL::uuid, NULL::jsonb;
    RETURN;
  END IF;
  IF r.created_at < utc_iso(p_not_before) THEN
    RETURN QUERY SELECT 'expired'::text, 0, NULL::uuid, NULL::text, NULL::uuid, NULL::jsonb;
    RETURN;
  END IF;
  IF coalesce((r.detail ->> 'proven')::boolean, false) THEN
    RETURN QUERY SELECT 'right'::text, 5 - r.attempts, r.id, r.email, r.user_id, r.detail;
    RETURN;
  END IF;
  -- A null guess only asks whether the code is proven, and counts nothing.
  IF p_guess IS NULL THEN
    RETURN QUERY SELECT 'unproven'::text, 5 - r.attempts, NULL::uuid, NULL::text, NULL::uuid, NULL::jsonb;
    RETURN;
  END IF;
  IF r.attempts >= 5 THEN
    RETURN QUERY SELECT 'dead'::text, 0, NULL::uuid, NULL::text, NULL::uuid, NULL::jsonb;
    RETURN;
  END IF;
  -- The coalesce matters: a row with no list must accept nothing, and `NOT null` is not true.
  IF NOT coalesce((r.detail -> 'accept') ? p_guess, false) THEN
    UPDATE keys SET attempts = attempts + 1 WHERE id = r.id;
    RETURN QUERY SELECT CASE WHEN r.attempts + 1 >= 5 THEN 'dead' ELSE 'wrong' END,
      greatest(0, 4 - r.attempts), NULL::uuid, NULL::text, NULL::uuid, NULL::jsonb;
    RETURN;
  END IF;
  UPDATE keys SET detail = detail || '{"proven": true}'::jsonb WHERE id = r.id RETURNING * INTO r;
  RETURN QUERY SELECT 'right'::text, 5 - r.attempts, r.id, r.email, r.user_id, r.detail;
END
$$;
--> statement-breakpoint

-- Uses a proven code: deletes it and returns it, once. The event the caller writes next is the record.
CREATE FUNCTION key_use(p_hash text, p_kind text, p_not_before timestamptz)
RETURNS TABLE (key_id uuid, key_email text, key_user_id uuid, key_detail jsonb)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  DELETE FROM keys
  WHERE hash = p_hash AND kind = p_kind AND family_id IS NULL
    AND created_at >= utc_iso(p_not_before) AND coalesce((detail ->> 'proven')::boolean, false)
  RETURNING id, email, user_id, detail
$$;
--> statement-breakpoint

-- The families a signed-in person can choose between, which is the one read about memberships that
-- has to cross families. It reads the signed-in user from the setting rather than taking one, so it
-- cannot be asked about anyone else.
CREATE FUNCTION my_families() RETURNS TABLE (family_id uuid, family_name text, kid_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT m.family_id, f.name, m.kid_id
  FROM members m JOIN families f ON f.id = m.family_id
  WHERE m.user_id = app_user() AND m.ended_at IS NULL
$$;
--> statement-breakpoint

-- ------------------------------------------------------------------------------ what the app may do
-- `events` is insert and select only, so "appended and never updated" is a privilege: a mistaken mark
-- is corrected by a later event, and a kid's or a family's deletion still reaches their events by
-- cascade, which runs as the owner. `content` is insert, select and delete, never update, so a
-- revision is immutable and its name and kind cannot drift from its body.
GRANT USAGE ON SCHEMA public TO lumischool_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON families, users, kids, members, keys TO lumischool_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON events TO lumischool_app;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON content TO lumischool_app;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION utc_iso(timestamptz), app_family(), app_user(), create_family(uuid, text, text),
  key_issue(text, text, text, text, uuid, jsonb), login_by_address(text),
  key_prove(text, text, text, timestamptz), key_use(text, text, timestamptz), my_families(),
  members_keep_a_parent(), families_have_a_parent() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION utc_iso(timestamptz), app_family(), app_user(), create_family(uuid, text, text),
  key_issue(text, text, text, text, uuid, jsonb), login_by_address(text),
  key_prove(text, text, text, timestamptz), key_use(text, text, timestamptz), my_families() TO lumischool_app;
--> statement-breakpoint

-- The last word: refuse to finish if the app role could step around any of the above.
DO $$
DECLARE
  r record;
BEGIN
  SELECT rolsuper, rolbypassrls INTO r FROM pg_roles WHERE rolname = 'lumischool_app';
  IF r.rolsuper OR r.rolbypassrls THEN
    RAISE EXCEPTION 'lumischool_app must be neither a superuser nor able to bypass row-level security';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tableowner = 'lumischool_app') THEN
    RAISE EXCEPTION 'lumischool_app must own no table';
  END IF;
END
$$;
