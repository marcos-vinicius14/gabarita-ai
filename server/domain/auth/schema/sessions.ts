/**
 * Auth Schema - Sessions Table
 *
 * Domain: Authentication
 * Responsibility: Define sessions table schema for BFF pattern
 *
 * Note: UNLOGGED table for performance (2-3x faster writes, no WAL)
 * Data loss on crash is acceptable for sessions.
 */

import { pgTable, text, timestamp, index, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Sessions Table (UNLOGGED)
 *
 * Server-side session storage for BFF pattern.
 * Tokens are stored server-side, never exposed to the client.
 */
export const sessions = pgTable('tb_sessions', {
    id: text('id').primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
}));
