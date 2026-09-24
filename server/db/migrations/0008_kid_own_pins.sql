DROP INDEX "keys_kid_pin_key";--> statement-breakpoint
CREATE UNIQUE INDEX "keys_kid_own_pin_key" ON "keys" USING btree ("family_id","kid_id") WHERE kind = 'kid-pin' and kid_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "keys_kid_pin_key" ON "keys" USING btree ("family_id") WHERE kind = 'kid-pin' and kid_id is null;