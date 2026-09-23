-- Automatic username candidates are checked globally, behind a security-definer function.
CREATE OR REPLACE FUNCTION kid_username_available(p_username text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM kids WHERE lower(settings->>'username') = lower(p_username)
  );
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION kid_username_available(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kid_username_available(text) TO lumischool_app;
