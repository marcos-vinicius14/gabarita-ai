/**
 * Auth Schema - Audit Logs Table
 * 
 * Domain: Authentication
 * Responsibility: Define audit logs table for security tracking
 */

import { pgTable, text, timestamp, uuid, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { users } from './users';

/**
 * Audit Action Enum
 * Tracks all security-relevant events
 */
export const auditActionEnum = pgEnum('audit_action', [
    'REGISTER',
    'LOGIN',
    'FAILED_LOGIN',
    'LOGOUT',
    'TOKEN_REFRESH',
    'PASSWORD_CHANGE',
    'PASSWORD_RESET_REQUEST',
    'PASSWORD_RESET_COMPLETE',
    'ACCOUNT_LOCKED',
    'ACCOUNT_UNLOCKED',
    'TOKENS_REVOKED',
]);

/**
 * Audit Logs Table
 * 
 * Security audit trail for all authentication events.
 * Essential for compliance, debugging, and security monitoring.
 * 
 * OWASP Requirement: Log all authentication events with sufficient detail.
 */
export const auditLogs = pgTable('tb_audit_logs', {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),

    // User (nullable for failed logins with unknown email)
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    // Action type
    action: auditActionEnum('action').notNull(),

    // Request context
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),

    // Additional context (e.g., reason for failure, token family ID)
    metadata: jsonb('metadata'),

    // Timestamp
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
