-- A deleted account must not be blocked by a picture it edited or a save receipt it left, as with events.actor.
ALTER TABLE "artworks" DROP CONSTRAINT "artworks_updated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "painting_saves" DROP CONSTRAINT "painting_saves_user_id_users_id_fk";
