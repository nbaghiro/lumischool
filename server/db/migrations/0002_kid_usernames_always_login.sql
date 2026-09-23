-- A child username is an identity, not an optional feature flag. The parent UI no longer
-- enables or disables individual usernames, so the lookup must accept every valid username.
CREATE OR REPLACE FUNCTION kid_login_lookup(p_username text, p_identity text, p_network text, p_hash text)
RETURNS TABLE (family_id uuid, kid_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('kid-network:' || p_network, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('kid-login:' || p_identity, 0));
  DELETE FROM keys WHERE kind = 'kid-attempt' AND created_at < utc_iso(now() - interval '1 day');
  IF (SELECT count(*) FROM keys WHERE kind = 'kid-attempt' AND email = p_identity AND created_at > utc_iso(now() - interval '15 minutes')) >= 5
     OR (SELECT count(*) FROM keys WHERE kind = 'kid-attempt' AND ip = p_network AND created_at > utc_iso(now() - interval '15 minutes')) >= 20 THEN
    RETURN;
  END IF;
  INSERT INTO keys (kind, hash, email, ip) VALUES ('kid-attempt', p_hash, p_identity, p_network);
  RETURN QUERY SELECT k.family_id, k.id FROM kids k
    WHERE lower(k.settings->>'username') = p_username;
END $$;
