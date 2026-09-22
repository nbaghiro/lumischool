-- Local development only. Gives the app role a login, with a password nobody would use anywhere
-- else. The migration creates the role without a login when it is missing and grants it what it may
-- do; this file is the local half, which a real environment replaces with its own login and secret.
--
-- It is idempotent and it is run from three places: by the container when its volume is first
-- created (docker-compose.yml mounts it into /docker-entrypoint-initdb.d), by scripts/db-up.sh on
-- every start so a volume created before this file existed gets it too, and by the integration
-- tests' setup, so they work against any Postgres they have an owner login for, such as a CI service.
--
-- Two roles exist locally. `lumischool` is the owner: the container's superuser, which runs the
-- migrations and the seed's catalogue writes. `lumischool_app` is what the server connects as, and it
-- is neither.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lumischool_app') THEN
    CREATE ROLE lumischool_app LOGIN PASSWORD 'lumischool_app'
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  ELSE
    ALTER ROLE lumischool_app WITH LOGIN PASSWORD 'lumischool_app'
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;
