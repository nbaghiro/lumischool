-- A sign-in or confirm code is issued whenever one is asked for: no limit per address, per network or
-- overall. A code still dies after five wrong guesses (key_prove), which is what keeps it from being
-- guessed.
CREATE OR REPLACE FUNCTION key_issue(p_kind text, p_hash text, p_email text, p_ip text, p_user_id uuid, p_detail jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_kind NOT IN ('sign-in', 'confirm') THEN
    RAISE EXCEPTION 'key_issue makes sign-in and confirm codes, not %', p_kind;
  END IF;
  INSERT INTO keys (kind, hash, email, ip, user_id, detail)
    VALUES (p_kind, p_hash, lower(p_email), p_ip, p_user_id, coalesce(p_detail, '{}'::jsonb));
  RETURN true;
END
$$;
