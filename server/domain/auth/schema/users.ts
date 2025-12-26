/**
 * Auth Schema - Users Table
 * 
 * Domain: Authentication
 * Responsibility: Define users table schema for auth domain
 */

import { pgTable, text, timestamp, uuid, integer, pgEnum } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

/**
 * User Roles Enum
 * RBAC: Role-Based Access Control
 */
export const userRoleEnum = pgEnum('user_role', ['free', 'trial', 'pro', 'admin']);

/**
 * Users Table
 * 
 * Core user entity with authentication fields.
 * Supports both password-based and OAuth authentication.
 */
export const users = pgTable('tb_users', {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    email: text('email').notNull().unique(),
    name: text('name'),
    passwordHash: text('password_hash'),
    role: userRoleEnum('role').default('free').notNull(),
    trialExpiresAt: timestamp('trial_expires_at'),
    failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
    lockedUntil: timestamp('locked_until'),
    emailVerified: timestamp('email_verified'),
    lastLogin: timestamp('last_login'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
