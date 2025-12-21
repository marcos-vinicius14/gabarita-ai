CREATE TABLE IF NOT EXISTS "tb_waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'landing_page',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tb_waitlist_email_unique" UNIQUE("email")
);
