-- Script para corrigir o estado do banco
-- Execute diretamente no PostgreSQL

-- 1. Verificar se o enum antigo ainda existe e dropar
DROP TYPE IF EXISTS "public"."user_role" CASCADE;

-- 2. Criar o novo enum (sem trial)
CREATE TYPE "public"."user_role" AS ENUM('free', 'pro', 'admin');

-- 3. Garantir que valores 'trial' virem 'free'
UPDATE "tb_users" SET "role" = 'free' WHERE "role" = 'trial' OR "role" IS NULL;

-- 4. Converter a coluna de text para o enum
ALTER TABLE "tb_users" 
  ALTER COLUMN "role" TYPE "public"."user_role" 
  USING "role"::text::"public"."user_role";

-- 5. Restaurar o default
ALTER TABLE "tb_users" ALTER COLUMN "role" SET DEFAULT 'free';

-- 6. Remover a coluna trial_expires_at se ainda existir
ALTER TABLE "tb_users" DROP COLUMN IF EXISTS "trial_expires_at";
