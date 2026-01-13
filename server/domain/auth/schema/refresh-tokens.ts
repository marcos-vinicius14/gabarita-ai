/**
 * Auth Schema - Refresh Tokens Table
 * 
 * Domain: Authentication
 * Responsibility: Define refresh tokens table for session management
 */

import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { users } from './users';

/**
 * Refresh Tokens Table
 * 
 * Stores hashed refresh tokens for secure session management.
 * Implements token rotation with family-based reuse detection.
 * 
 * Security Features:
 * - Tokens are stored as SHA-256 hashes (never plain text)
 * - Family ID tracks token lineage for rotation attack detection
 * - If a revoked token is reused, all family tokens are invalidated
 */
export const refreshTokens = pgTable('tb_refresh_tokens', {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),

    // Token hash (SHA-256 of the opaque token sent to client)
    tokenHash: text('token_hash').notNull().unique(),

    // User relationship
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Token rotation: Family ID links all rotated tokens
    // If a token from this family is reused after rotation, revoke all
    familyId: uuid('family_id').notNull(),

    // Expiration & Status
    expiresAt: timestamp('expires_at').notNull(),
    isRevoked: boolean('is_revoked').default(false).notNull(),

    // Metadata
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
