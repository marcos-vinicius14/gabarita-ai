---
description: How to create and run database migrations
---

# Database Migrations

Follow this workflow to manage database schema changes using Drizzle ORM.

## 1. Modify Schema

1.  **Edit Schema File**: `server/db/tables/[table].ts` or `server/domain/[feature]/schema/[table].ts`.
    - Add/remove columns.
    - Update `pgTable` definition.

## 2. Generate Migration

1.  **Run Drizzle Kit**:
    ```bash
    pnpm db:generate
    ```
    - Check the generated SQL file in `server/db/migrations`.
    - Verify the SQL looks correct (no destructive drops unless intended).

## 3. Apply Migration

1.  **Push to Database** (Dev/Local):
    ```bash
    pnpm db:push
    ```
    This applies changes directly to the database.

2.  **Run Migrations** (Production - if configured):
    ```bash
    pnpm db:migrate
    ```

## Checklist
- [ ] Schema file updated
- [ ] `pnpm db:generate` run successfully
- [ ] SQL file verified
- [ ] `pnpm db:push` applied successfully
