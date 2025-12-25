CREATE TYPE "public"."user_role" AS ENUM('free', 'trial', 'pro', 'admin');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('REGISTER', 'LOGIN', 'FAILED_LOGIN', 'LOGOUT', 'TOKEN_REFRESH', 'PASSWORD_CHANGE', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_COMPLETE', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'TOKENS_REVOKED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tb_refresh_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tb_refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tb_audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"action" "audit_action" NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tb_users" ALTER COLUMN "role" SET DATA TYPE user_role;--> statement-breakpoint
ALTER TABLE "tb_users" ALTER COLUMN "role" SET DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "tb_users" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_users" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "tb_users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_users" ADD COLUMN "locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "tb_users" ADD COLUMN "email_verified" timestamp;--> statement-breakpoint
ALTER TABLE "tb_users" ADD COLUMN "last_login" timestamp;--> statement-breakpoint
ALTER TABLE "tb_users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tb_refresh_tokens" ADD CONSTRAINT "tb_refresh_tokens_user_id_tb_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."tb_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tb_audit_logs" ADD CONSTRAINT "tb_audit_logs_user_id_tb_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."tb_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "tb_users" DROP COLUMN IF EXISTS "plan";