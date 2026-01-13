ALTER TABLE "tb_users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "tb_users" ADD COLUMN "subscription_status" text;--> statement-breakpoint
ALTER TABLE "tb_users" ADD COLUMN "subscription_plan_id" text;--> statement-breakpoint
ALTER TABLE "tb_users" ADD COLUMN "subscription_ends_at" timestamp;