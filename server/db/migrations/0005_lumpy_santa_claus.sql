ALTER TABLE "tb_reviews" DROP CONSTRAINT "tb_reviews_card_id_tb_cards_id_fk";
--> statement-breakpoint
ALTER TABLE "tb_reviews" DROP CONSTRAINT "tb_reviews_user_id_tb_users_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tb_reviews" ADD CONSTRAINT "tb_reviews_card_id_tb_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."tb_cards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tb_reviews" ADD CONSTRAINT "tb_reviews_user_id_tb_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."tb_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
