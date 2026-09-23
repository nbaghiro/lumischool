CREATE FUNCTION reserve_invitation(p_family uuid, p_email text, p_ip text, p_hash text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_family IS DISTINCT FROM app_family() THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('code-issuance-budget', 0));
  DELETE FROM keys WHERE kind = 'invite' AND detail->>'budget' = 'true' AND created_at < utc_iso(now() - interval '1 day');
  IF EXISTS (SELECT 1 FROM keys WHERE kind = 'invite' AND detail->>'budget' = 'true' AND email = p_email AND created_at > utc_iso(now() - interval '1 minute'))
    OR (SELECT count(*) FROM keys WHERE kind = 'invite' AND detail->>'budget' = 'true' AND email = p_email AND created_at > utc_iso(now() - interval '1 hour')) >= 3
    OR (SELECT count(*) FROM keys WHERE kind = 'invite' AND detail->>'budget' = 'true' AND ip = p_ip AND created_at > utc_iso(now() - interval '1 hour')) >= 20
    OR (SELECT count(*) FROM keys WHERE kind IN ('sign-in', 'confirm', 'invite') AND created_at > utc_iso(now() - interval '1 hour')) >= 500 THEN
    RETURN false;
  END IF;
  INSERT INTO keys(family_id, kind, hash, email, ip, detail) VALUES (p_family, 'invite', p_hash, p_email, p_ip, '{"budget":true}');
  RETURN true;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION reserve_invitation(uuid, text, text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION reserve_invitation(uuid, text, text, text) TO lumischool_app;
