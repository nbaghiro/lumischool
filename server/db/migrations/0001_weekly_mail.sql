CREATE TABLE "mail_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"week" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"recipient" text NOT NULL,
	"mode" text NOT NULL,
	"subject" text NOT NULL,
	"body_text" text NOT NULL,
	"body_html" text NOT NULL,
	"created_at" text NOT NULL,
	"attempted_at" text,
	"lease_until" text,
	"provider_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "mail_deliveries_week_key" UNIQUE("family_id","user_id","week"),
	CONSTRAINT "mail_deliveries_status" CHECK ("mail_deliveries"."status" in ('pending', 'sending', 'sent', 'delivered', 'failed', 'suppressed', 'uncertain'))
);
--> statement-breakpoint
ALTER TABLE "mail_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mail_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"mode" text DEFAULT 'off' NOT NULL,
	"changed_at" text NOT NULL,
	CONSTRAINT "mail_preferences_recipient_key" UNIQUE("family_id","user_id"),
	CONSTRAINT "mail_preferences_mode" CHECK ("mail_preferences"."mode" in ('off', 'private', 'detailed'))
);
--> statement-breakpoint
ALTER TABLE "mail_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mail_deliveries" ADD CONSTRAINT "mail_deliveries_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_deliveries" ADD CONSTRAINT "mail_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_preferences" ADD CONSTRAINT "mail_preferences_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_preferences" ADD CONSTRAINT "mail_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mail_deliveries_provider_idx" ON "mail_deliveries" USING btree ("provider_id");
--> statement-breakpoint
ALTER TABLE mail_preferences FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY mail_preferences_family ON mail_preferences USING (family_id = (SELECT app_family())) WITH CHECK (family_id = (SELECT app_family()));
--> statement-breakpoint
ALTER TABLE mail_deliveries FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY mail_deliveries_family ON mail_deliveries USING (family_id = (SELECT app_family())) WITH CHECK (family_id = (SELECT app_family()));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON mail_preferences, mail_deliveries TO lumischool_app;
--> statement-breakpoint
CREATE FUNCTION mail_recipients() RETURNS TABLE(family_id uuid, user_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT p.family_id, p.user_id FROM mail_preferences p
 WHERE p.mode <> 'off' AND EXISTS (SELECT 1 FROM members m WHERE m.family_id = p.family_id AND m.user_id = p.user_id AND m.kid_id IS NULL AND m.ended_at IS NULL)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION mail_recipients() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION mail_recipients() TO lumischool_app;
--> statement-breakpoint
CREATE FUNCTION mail_family(message_id text) RETURNS TABLE(family_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT d.family_id FROM mail_deliveries d WHERE d.provider_id = message_id LIMIT 1
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION mail_family(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION mail_family(text) TO lumischool_app;
--> statement-breakpoint
CREATE FUNCTION clear_child_mail() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
 BEGIN
 UPDATE mail_deliveries SET body_text = '', body_html = '', status = 'suppressed' WHERE family_id = OLD.family_id;
 RETURN OLD;
 END;
$$;
--> statement-breakpoint
CREATE TRIGGER clear_child_mail BEFORE DELETE ON kids FOR EACH ROW EXECUTE FUNCTION clear_child_mail();
--> statement-breakpoint
CREATE FUNCTION withdraw_child_mail() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
 BEGIN
 IF NEW.kind = 'consent-withdrawn' THEN
 UPDATE mail_deliveries SET body_text = '', body_html = '', status = 'suppressed' WHERE family_id = NEW.family_id;
 END IF;
 RETURN NEW;
 END;
$$;
--> statement-breakpoint
CREATE TRIGGER withdraw_child_mail AFTER INSERT ON events FOR EACH ROW EXECUTE FUNCTION withdraw_child_mail();
