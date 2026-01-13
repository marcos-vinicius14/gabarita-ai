CREATE TABLE IF NOT EXISTS "cache" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tb_sessions" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cache_expires_at_idx" ON "cache" USING btree ("expires_at");