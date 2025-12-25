/**
 * Authentication Repository
 * 
 * Single Responsibility: Database operations for authentication.
 * Handles users, refresh tokens, and audit logs.
 * 
 * Note: Uses 'any' type for db operations due to Drizzle version conflicts
 * between @neondatabase/serverless and drizzle-orm packages.
 */

import { eq } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { users, refreshTokens, auditLogs } from './schema';
import type {
    User,
    NewUser,
    RefreshTokenRecord,
    NewRefreshToken,
    NewAuditLog
} from './auth.types';

// ============================================================================
// User Operations
// ============================================================================

/**
 * Finds a user by email
 */
export async function findUserByEmail(email: string): Promise<User | undefined> {
    const result = await (db as any).select().from(users).where(eq(users.email, email.toLowerCase()));
    return result[0] as User | undefined;
}

/**
 * Finds a user by ID
 */
export async function findUserById(userId: string): Promise<User | undefined> {
    const result = await (db as any).select().from(users).where(eq(users.id, userId));
    return result[0] as User | undefined;
}

/**
 * Creates a new user
 */
export async function createUser(data: NewUser): Promise<User> {
    const result = await (db as any).insert(users).values({
        ...data,
        email: data.email.toLowerCase(),
    }).returning();
    return result[0] as User;
}

/**
 * Updates user's failed login attempts
 */
export async function updateFailedLoginAttempts(
    userId: string,
    attempts: number,
    lockedUntil: Date | null = null
): Promise<void> {
    await (db as any).update(users)
        .set({
            failedLoginAttempts: attempts,
            lockedUntil,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

/**
 * Resets failed login attempts and updates last login
 */
export async function resetLoginAttemptsAndUpdateLastLogin(userId: string): Promise<void> {
    await (db as any).update(users)
        .set({
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLogin: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

// ============================================================================
// Refresh Token Operations
// ============================================================================

/**
 * Creates a new refresh token
 */
export async function createRefreshToken(data: NewRefreshToken): Promise<void> {
    await (db as any).insert(refreshTokens).values(data);
}

/**
 * Finds a refresh token by hash
 */
export async function findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | undefined> {
    const result = await (db as any).select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash));
    return result[0] as RefreshTokenRecord | undefined;
}

/**
 * Revokes a specific refresh token
 */
export async function revokeRefreshToken(tokenHash: string): Promise<void> {
    await (db as any).update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.tokenHash, tokenHash));
}

/**
 * Revokes all refresh tokens for a user
 * Used when a security breach is detected
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
    await (db as any).update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.userId, userId));
}

/**
 * Revokes all tokens in a family
 * Used when token reuse is detected (rotation attack)
 */
export async function revokeTokenFamily(familyId: string): Promise<void> {
    await (db as any).update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.familyId, familyId));
}

/**
 * Deletes expired refresh tokens (cleanup)
 */
export async function deleteExpiredTokens(): Promise<void> {
    await (db as any).delete(refreshTokens)
        .where(eq(refreshTokens.isRevoked, true));
}

// ============================================================================
// Audit Log Operations
// ============================================================================

/**
 * Creates an audit log entry
 */
export async function createAuditLog(data: NewAuditLog): Promise<void> {
    await (db as any).insert(auditLogs).values(data);
}
