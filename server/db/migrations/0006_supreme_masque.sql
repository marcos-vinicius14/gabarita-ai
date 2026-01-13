CREATE TYPE "public"."transaction_type" AS ENUM('purchase', 'consumption', 'bonus', 'refund');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tb_credit_transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"description" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tb_users" ADD COLUMN "credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_users" ADD COLUMN "monthly_uploads_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_users" ADD COLUMN "monthly_uploads_reset_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tb_credit_transactions" ADD CONSTRAINT "tb_credit_transactions_user_id_tb_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."tb_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_transactions_user_id_idx" ON "tb_credit_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_transactions_created_at_idx" ON "tb_credit_transactions" USING btree ("created_at");