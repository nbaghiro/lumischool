CREATE TABLE "artworks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"family_id" uuid NOT NULL,
	"kid_id" uuid,
	"owner_user_id" uuid,
	"title" text NOT NULL,
	"document" jsonb NOT NULL,
	"thumbnail" text NOT NULL,
	"revision" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" text,
	CONSTRAINT "artworks_family_id_key" UNIQUE("family_id","id"),
	CONSTRAINT "artworks_owner" CHECK (("artworks"."kid_id" is null) <> ("artworks"."owner_user_id" is null)),
	CONSTRAINT "artworks_revision" CHECK ("artworks"."revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "artworks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "painting_saves" (
	"id" uuid PRIMARY KEY NOT NULL,
	"family_id" uuid NOT NULL,
	"artwork_id" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"document" jsonb NOT NULL,
	"thumbnail" text NOT NULL,
	"revision" integer NOT NULL,
	"conflict" integer NOT NULL,
	"saved_at" text NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "painting_saves" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_family_id_kid_id_kids_family_id_id_fk" FOREIGN KEY ("family_id","kid_id") REFERENCES "public"."kids"("family_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "painting_saves" ADD CONSTRAINT "painting_saves_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "painting_saves" ADD CONSTRAINT "painting_saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "painting_saves" ADD CONSTRAINT "painting_saves_family_id_artwork_id_artworks_family_id_id_fk" FOREIGN KEY ("family_id","artwork_id") REFERENCES "public"."artworks"("family_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artworks_gallery_idx" ON "artworks" USING btree ("family_id","kid_id","owner_user_id","updated_at");
--> statement-breakpoint
ALTER TABLE artworks FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY artworks_family ON artworks USING (family_id = (SELECT app_family())) WITH CHECK (family_id = (SELECT app_family()));
--> statement-breakpoint
ALTER TABLE painting_saves FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY painting_saves_family ON painting_saves USING (family_id = (SELECT app_family())) WITH CHECK (family_id = (SELECT app_family()));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON artworks, painting_saves TO lumischool_app;
