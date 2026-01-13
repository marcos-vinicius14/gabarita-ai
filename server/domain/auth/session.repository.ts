/**
 * Session Repository
 *
 * Single Responsibility: Database operations for sessions.
 * Handles CRUD operations for the sessions table using Drizzle ORM.
 */

import { eq, lt, and } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { sessions } from './schema/sessions';
import type { Session } from './session.types';

// =============================================================================
// Types
// =============================================================================

interface CreateSessionInput {
    id: string;
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}

interface UpdateSessionInput {
    accessToken?: string;
    refreshToken?: string;
}

// =============================================================================
// Repository Functions
// =============================================================================

export async function createSession(input: CreateSessionInput): Promise<void> {
    await (db as any)
        .insert(sessions)
        .values({
            id: input.id,
            userId: input.userId,
            accessToken: input.accessToken,
            refreshToken: input.refreshToken,
            expiresAt: input.expiresAt,
        });
}

export async function findSessionById(sessionId: string): Promise<Session | null> {
    const now = new Date();
    const result = await (db as any)
        .select()
        .from(sessions)
        .where(and(
            eq(sessions.id, sessionId),
            lt(now, sessions.expiresAt)
        ));

    const row = result[0];
    if (!row) return null;

    return {
        id: row.id,
        userId: row.userId,
        accessToken: row.accessToken,
        refreshToken: row.refreshToken,
        expiresAt: new Date(row.expiresAt),
        createdAt: new Date(row.createdAt),
    };
}

export async function updateSession(sessionId: string, data: UpdateSessionInput): Promise<boolean> {
    const updates: Record<string, string | undefined> = {};

    if (data.accessToken !== undefined) updates.accessToken = data.accessToken;
    if (data.refreshToken !== undefined) updates.refreshToken = data.refreshToken;

    if (Object.keys(updates).length === 0) return true;

    const result = await (db as any)
        .update(sessions)
        .set(updates)
        .where(eq(sessions.id, sessionId))
        .returning({ id: sessions.id });

    return result.length > 0;
}

export async function deleteSession(sessionId: string): Promise<boolean> {
    const result = await (db as any)
        .delete(sessions)
        .where(eq(sessions.id, sessionId))
        .returning({ id: sessions.id });

    return result.length > 0;
}

export async function deleteUserSessions(userId: string): Promise<number> {
    const result = await (db as any)
        .delete(sessions)
        .where(eq(sessions.userId, userId))
        .returning({ id: sessions.id });

    return result.length;
}

export async function deleteExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await (db as any)
        .delete(sessions)
        .where(lt(sessions.expiresAt, now))
        .returning({ id: sessions.id });

    return result.length;
}
