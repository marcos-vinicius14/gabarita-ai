/**
 * Session Service
 *
 * Server-side session management for BFF pattern.
 * Tokens are stored server-side, never exposed to the client.
 *
 * Storage: PostgreSQL via Drizzle ORM (Postgres Everything approach)
 * Falls back to in-memory Map if database is not available.
 */

import { generateRandomToken } from './tokens';
import * as sessionRepository from '~/server/domain/auth/session.repository';
import type { Session, SessionData } from '~/server/domain/auth/session.types';

// Re-export types for consumers
export type { Session, SessionData };


const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MEMORY_CACHE_TTL_MS = 180_000; // 3 minutes

const memoryStore = new Map<string, Session>();
const sessionCache = new Map<string, { session: Session; expiresAt: number }>();

const generateSessionId = () => generateRandomToken(32);

const isDbAvailable = (): boolean => {
    try {
        return !!process.env.DATABASE_URL;
    } catch {
        return false;
    }
};

export async function createSession(data: SessionData): Promise<string> {
    const sessionId = generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

    const session: Session = {
        id: sessionId,
        userId: data.userId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt,
        createdAt: now,
    };

    if (!isDbAvailable()) {
        memoryStore.set(sessionId, session);
        return sessionId;
    }

    await sessionRepository.createSession({
        id: sessionId,
        userId: data.userId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt,
    });

    return sessionId;
}

export async function getSession(sessionId: string): Promise<Session | null> {
    const cached = sessionCache.get(sessionId);

    if (cached && Date.now() < cached.expiresAt) return cached.session;
    sessionCache.delete(sessionId);

    if (!isDbAvailable()) {
        const session = memoryStore.get(sessionId);
        if (!session) return null;

        if (session.expiresAt < new Date()) {
            memoryStore.delete(sessionId);
            return null;
        }

        sessionCache.set(sessionId, { session, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
        return session;
    }

    const session = await sessionRepository.findSessionById(sessionId);
    if (!session) return null;

    sessionCache.set(sessionId, { session, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
    return session;
}

export async function updateSession(
    sessionId: string,
    data: Partial<Pick<Session, 'accessToken' | 'refreshToken'>>
): Promise<boolean> {
    sessionCache.delete(sessionId);

    const session = await getSession(sessionId);
    if (!session) return false;

    if (!isDbAvailable()) {
        memoryStore.set(sessionId, { ...session, ...data });
        return true;
    }

    return sessionRepository.updateSession(sessionId, data);
}

export async function deleteSession(sessionId: string): Promise<boolean> {
    sessionCache.delete(sessionId);

    const session = await getSession(sessionId);
    if (!session) return false;

    if (!isDbAvailable()) {
        memoryStore.delete(sessionId);
        return true;
    }

    return sessionRepository.deleteSession(sessionId);
}

export async function deleteUserSessions(userId: string): Promise<number> {
    if (!isDbAvailable()) {
        const sessionsToDelete = [...memoryStore.entries()]
            .filter(([, session]) => session.userId === userId)
            .map(([id]) => id);

        sessionsToDelete.forEach(id => memoryStore.delete(id));
        return sessionsToDelete.length;
    }

    return sessionRepository.deleteUserSessions(userId);
}


export async function cleanupExpiredSessions(): Promise<number> {
    if (!isDbAvailable()) {
        const now = new Date();
        const expiredSessions = [...memoryStore.entries()]
            .filter(([, session]) => session.expiresAt < now)
            .map(([id]) => id);

        expiredSessions.forEach(id => memoryStore.delete(id));
        return expiredSessions.length;
    }

    return sessionRepository.deleteExpiredSessions();
}
