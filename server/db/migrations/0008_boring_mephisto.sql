ALTER TABLE "tb_users" ADD COLUMN "streak_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_users" ADD COLUMN "last_active_date" date;--> statement-breakpoint
ALTER TABLE "tb_users" ADD COLUMN "total_cards_reviewed" integer DEFAULT 0 NOT NULL;