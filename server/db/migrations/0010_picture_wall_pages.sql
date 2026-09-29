DROP INDEX "artworks_gallery_idx";--> statement-breakpoint
CREATE INDEX "artworks_wall_idx" ON "artworks" USING btree ("family_id","kid_id","owner_user_id","updated_at","id") WHERE "artworks"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "artworks_title_idx" ON "artworks" USING gin (to_tsvector('simple', "title"));