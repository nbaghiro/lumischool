-- Local credentials only. Provision lumischool_app with an environment-specific password before migrations elsewhere.
DO $$
BEGIN
  PERFORM pg_advisory_xact_lock(8502, 2);
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lumischool_app') THEN
    CREATE ROLE lumischool_app LOGIN PASSWORD 'lumischool_app'
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  ELSE
    ALTER ROLE lumischool_app WITH LOGIN PASSWORD 'lumischool_app'
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;
