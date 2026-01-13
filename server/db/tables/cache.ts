/**
 * Cache Table Schema
 *
 * UNLOGGED table for high-performance caching.
 * 2-3x faster than regular tables (no WAL).
 * Data loss on crash is acceptable for cache.
 */

import { pgTable, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const cache = pgTable('cache', {
    key: text('key').primaryKey(),
    value: jsonb('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    expiresAtIdx: index('cache_expires_at_idx').on(table.expiresAt),
}));
