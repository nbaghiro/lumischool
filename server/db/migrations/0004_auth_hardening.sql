-- Forward-only auth hardening. Existing functions retain their narrow grants.
CREATE OR REPLACE FUNCTION key_issue(p_kind text, p_hash text, p_email text, p_ip text, p_user_id uuid, p_detail jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  addr text := lower(p_email);
BEGIN
  IF p_kind NOT IN ('sign-in', 'confirm') THEN
    RAISE EXCEPTION 'key_issue makes sign-in and confirm codes, not %', p_kind;
  END IF;
  -- One short issuance transaction protects the aggregate budget as well as each address.
  PERFORM pg_advisory_xact_lock(hashtextextended('code-issuance-budget', 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('code:' || addr, 0));
  IF EXISTS (SELECT 1 FROM keys WHERE kind IN ('sign-in', 'confirm') AND email = addr AND created_at > utc_iso(now() - interval '1 minute') AND NOT coalesce((detail->>'delivery_failed')::boolean, false)) THEN
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
CREATE FUNCTION key_delivery_failed(p_hash text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE keys SET detail = (detail - 'proven') || '{"accept": [], "delivery_failed": true}'::jsonb
  WHERE hash = p_hash AND kind = 'sign-in' AND family_id IS NULL;
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION key_delivery_failed(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION key_delivery_failed(text) TO lumischool_app;
--> statement-breakpoint
CREATE FUNCTION kid_login_succeeded(p_hash text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  DELETE FROM keys WHERE kind = 'kid-attempt' AND hash = p_hash AND family_id IS NULL;
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION kid_login_succeeded(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kid_login_succeeded(text) TO lumischool_app;
