/**
 * Session Store
 * 
 * Server-side session management for BFF pattern.
 * Tokens are stored server-side, never exposed to the client.
 * 
 * - Development: In-memory Map (no persistence)
 * - Production: Redis (Upstash)
 */

import { Redis } from '@upstash/redis';
import { generateRandomToken } from './tokens';

export interface Session {
    id: string;
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    createdAt: Date;
}

interface SessionData {
    userId: string;
    accessToken: string;
    refreshToken: string;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const memoryStore = new Map<string, Session>();

function getRedisClient(): Redis | null {
    const config = useRuntimeConfig();

    if (!config.upstashRedisUrl || !config.upstashRedisToken) {
        return null;
    }

    return new Redis({
        url: config.upstashRedisUrl as string,
        token: config.upstashRedisToken as string,
    });
}

function generateSessionId(): string {
    return generateRandomToken(32);
}

function getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
}

function getUserSessionsKey(userId: string): string {
    return `user_sessions:${userId}`;
}

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

    const redis = getRedisClient();

    if (redis) {
        const key = getSessionKey(sessionId);
        const userKey = getUserSessionsKey(data.userId);

        await redis.set(key, JSON.stringify(session), { ex: SESSION_TTL_SECONDS });
        await redis.sadd(userKey, sessionId);
        await redis.expire(userKey, SESSION_TTL_SECONDS);
    } else {
        memoryStore.set(sessionId, session);
    }

    return sessionId;
}

export async function getSession(sessionId: string): Promise<Session | null> {
    const redis = getRedisClient();

    if (redis) {
        const key = getSessionKey(sessionId);
        const data = await redis.get<string>(key);

        if (!data) return null;

        const session = typeof data === 'string' ? JSON.parse(data) : data;
        session.expiresAt = new Date(session.expiresAt);
        session.createdAt = new Date(session.createdAt);

        return session;
    }

    const session = memoryStore.get(sessionId);

    if (!session) return null;

    if (session.expiresAt < new Date()) {
        memoryStore.delete(sessionId);
        return null;
    }

    return session;
}

export async function updateSession(
    sessionId: string,
    data: Partial<Pick<Session, 'accessToken' | 'refreshToken'>>
): Promise<boolean> {
    const session = await getSession(sessionId);

    if (!session) return false;

    const updatedSession: Session = {
        ...session,
        ...data,
    };

    const redis = getRedisClient();

    if (redis) {
        const key = getSessionKey(sessionId);
        const remainingTtl = Math.floor(
            (session.expiresAt.getTime() - Date.now()) / 1000
        );

        if (remainingTtl > 0) {
            await redis.set(key, JSON.stringify(updatedSession), { ex: remainingTtl });
        }
    } else {
        memoryStore.set(sessionId, updatedSession);
    }

    return true;
}

export async function deleteSession(sessionId: string): Promise<boolean> {
    const session = await getSession(sessionId);

    if (!session) return false;

    const redis = getRedisClient();

    if (redis) {
        const key = getSessionKey(sessionId);
        const userKey = getUserSessionsKey(session.userId);

        await redis.del(key);
        await redis.srem(userKey, sessionId);
    } else {
        memoryStore.delete(sessionId);
    }

    return true;
}

export async function deleteUserSessions(userId: string): Promise<number> {
    const redis = getRedisClient();

    if (redis) {
        const userKey = getUserSessionsKey(userId);
        const sessionIds = await redis.smembers(userKey);

        if (sessionIds.length === 0) return 0;

        const keys = sessionIds.map((id) => getSessionKey(id));
        await redis.del(...keys, userKey);

        return sessionIds.length;
    }

    let count = 0;
    for (const [id, session] of memoryStore) {
        if (session.userId === userId) {
            memoryStore.delete(id);
            count++;
        }
    }

    return count;
}
