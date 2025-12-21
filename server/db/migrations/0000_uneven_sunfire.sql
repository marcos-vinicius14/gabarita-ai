CREATE TYPE "public"."deck_source_type" AS ENUM('topic', 'pdf_upload');--> statement-breakpoint
CREATE TYPE "public"."deck_status" AS ENUM('processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tb_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" text DEFAULT 'student',
	"plan" text DEFAULT 'free',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tb_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tb_decks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"source_type" "deck_source_type" DEFAULT 'topic' NOT NULL,
	"status" "deck_status" DEFAULT 'processing' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tb_cards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deck_id" uuid NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"embedding" vector(768),
	"stability" integer DEFAULT 0,
	"difficulty" integer DEFAULT 0,
	"last_review" timestamp,
	"next_review" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tb_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"card_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"reviewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tb_decks" ADD CONSTRAINT "tb_decks_user_id_tb_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."tb_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tb_cards" ADD CONSTRAINT "tb_cards_deck_id_tb_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."tb_decks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tb_reviews" ADD CONSTRAINT "tb_reviews_card_id_tb_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."tb_cards"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tb_reviews" ADD CONSTRAINT "tb_reviews_user_id_tb_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."tb_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "decks_user_id_idx" ON "tb_decks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cards_deck_id_idx" ON "tb_cards" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cards_next_review_idx" ON "tb_cards" USING btree ("next_review");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_card_id_idx" ON "tb_reviews" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_user_id_idx" ON "tb_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_reviewed_at_idx" ON "tb_reviews" USING btree ("reviewed_at");