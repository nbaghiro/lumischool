ALTER TABLE keys DROP CONSTRAINT keys_family_null_only_before_a_family;
--> statement-breakpoint
ALTER TABLE keys ADD CONSTRAINT keys_family_null_only_before_a_family CHECK (
 family_id IS NOT NULL OR kind IN ('sign-in', 'confirm', 'kid-attempt') OR
 (kind = 'browser' AND user_id IS NULL AND kid_id IS NULL AND email IS NULL AND
  detail->>'originFamily' IS NOT NULL)
);
--> statement-breakpoint
CREATE POLICY detached_browser ON keys
 USING (kind = 'browser' AND family_id IS NULL AND detail->>'originFamily' = (SELECT app_family())::text)
 WITH CHECK (kind = 'browser' AND family_id IS NULL AND detail->>'originFamily' = (SELECT app_family())::text);
