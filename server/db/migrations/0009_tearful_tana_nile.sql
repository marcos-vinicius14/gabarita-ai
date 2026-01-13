-- Remove default first to allow enum modification
ALTER TABLE "tb_users" ALTER COLUMN "role" DROP DEFAULT;

-- Drop the trial_expires_at column
ALTER TABLE "tb_users" DROP COLUMN IF EXISTS "trial_expires_at";

-- Convert role to text temporarily
ALTER TABLE "tb_users" ALTER COLUMN "role" SET DATA TYPE text USING "role"::text;

-- Update any 'trial' values to 'free'
UPDATE "tb_users" SET "role" = 'free' WHERE "role" = 'trial';

-- Drop the old enum
DROP TYPE IF EXISTS "public"."user_role";

-- Create new enum without 'trial'
CREATE TYPE "public"."user_role" AS ENUM('free', 'pro', 'admin');

-- Convert column back to enum
ALTER TABLE "tb_users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::text::"public"."user_role";

-- Restore default
ALTER TABLE "tb_users" ALTER COLUMN "role" SET DEFAULT 'free';