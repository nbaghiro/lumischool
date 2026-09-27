CREATE TABLE "tutoring_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"family_id" uuid NOT NULL,
	"user_id" uuid,
	"kid_id" uuid,
	"lesson_id" text,
	"content_hash" text NOT NULL,
	"preferences" jsonb NOT NULL,
	"state" jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"expires_at" text NOT NULL,
	CONSTRAINT "tutoring_sessions_family_id_id_key" UNIQUE("family_id","id"),
	CONSTRAINT "tutoring_session_actor" CHECK (("tutoring_sessions"."user_id" is null) <> ("tutoring_sessions"."kid_id" is null))
);
--> statement-breakpoint
ALTER TABLE "tutoring_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tutoring_turns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"family_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"status" text NOT NULL,
	"expected_revision" integer NOT NULL,
	"result" jsonb,
	"model" text,
	"prompt_version" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tutoring_turns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tutoring_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" uuid NOT NULL,
	"period" text NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"audio_chars" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tutoring_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tutoring_sessions" ADD CONSTRAINT "tutoring_sessions_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutoring_sessions" ADD CONSTRAINT "tutoring_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutoring_sessions" ADD CONSTRAINT "tutoring_sessions_family_id_kid_id_kids_family_id_id_fk" FOREIGN KEY ("family_id","kid_id") REFERENCES "public"."kids"("family_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutoring_turns" ADD CONSTRAINT "tutoring_turns_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutoring_turns" ADD CONSTRAINT "tutoring_turns_family_id_session_id_tutoring_sessions_family_id_id_fk" FOREIGN KEY ("family_id","session_id") REFERENCES "public"."tutoring_sessions"("family_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutoring_usage" ADD CONSTRAINT "tutoring_usage_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tutoring_turns_session_idx" ON "tutoring_turns" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE tutoring_sessions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tutoring_sessions_family ON tutoring_sessions USING (family_id = (SELECT app_family())) WITH CHECK (family_id = (SELECT app_family()));
--> statement-breakpoint
ALTER TABLE tutoring_turns FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tutoring_turns_family ON tutoring_turns USING (family_id = (SELECT app_family())) WITH CHECK (family_id = (SELECT app_family()));
--> statement-breakpoint
ALTER TABLE tutoring_usage FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tutoring_usage_family ON tutoring_usage USING (family_id = (SELECT app_family())) WITH CHECK (family_id = (SELECT app_family()));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON tutoring_sessions, tutoring_turns, tutoring_usage TO lumischool_app;
