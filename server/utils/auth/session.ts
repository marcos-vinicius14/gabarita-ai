/**
 * Session Store
 * 
 * Server-side session management for BFF pattern.
 * Tokens are stored server-side, never exposed to the client.
 * 
 * Storage priority:
 * 1. Upstash Redis (Production - via NUXT_UPSTASH_REDIS_URL)
 * 2. Local Redis (Development - via REDIS_URL, e.g. Docker)
 * 3. In-memory Map (Fallback - no persistence)
 */

import { Redis as UpstashRedis } from '@upstash/redis';
import IORedis from 'ioredis';
import { useRuntimeConfig } from '#imports';
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

interface RedisAdapter {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
    del(...keys: string[]): Promise<void>;
    sadd(key: string, member: string): Promise<void>;
    smembers(key: string): Promise<string[]>;
    srem(key: string, member: string): Promise<void>;
    expire(key: string, seconds: number): Promise<void>;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const memoryStore = new Map<string, Session>();

let redisAdapter: RedisAdapter | null | undefined = undefined;

function createUpstashAdapter(url: string, token: string): RedisAdapter {
    const client = new UpstashRedis({ url, token });

    return {
        async get(key: string) {
            const data = await client.get<string>(key);
            return data;
        },
        async set(key: string, value: string, ttlSeconds: number) {
            await client.set(key, value, { ex: ttlSeconds });
        },
        async del(...keys: string[]) {
            await client.del(...keys);
        },
        async sadd(key: string, member: string) {
            await client.sadd(key, member);
        },
        async smembers(key: string) {
            return await client.smembers(key);
        },
        async srem(key: string, member: string) {
            await client.srem(key, member);
        },
        async expire(key: string, seconds: number) {
            await client.expire(key, seconds);
        },
    };
}

function createIORedisAdapter(url: string): RedisAdapter {
    const client = new IORedis(url);

    return {
        async get(key: string) {
            return await client.get(key);
        },
        async set(key: string, value: string, ttlSeconds: number) {
            await client.set(key, value, 'EX', ttlSeconds);
        },
        async del(...keys: string[]) {
            await client.del(...keys);
        },
        async sadd(key: string, member: string) {
            await client.sadd(key, member);
        },
        async smembers(key: string) {
            return await client.smembers(key);
        },
        async srem(key: string, member: string) {
            await client.srem(key, member);
        },
        async expire(key: string, seconds: number) {
            await client.expire(key, seconds);
        },
    };
}

function getRedisAdapter(): RedisAdapter | null {
    if (redisAdapter !== undefined) {
        return redisAdapter;
    }

    try {
        const config = useRuntimeConfig();

        if (config.upstashRedisUrl && config.upstashRedisToken) {
            console.log('[Session] Using Upstash Redis (production).');
            redisAdapter = createUpstashAdapter(
                config.upstashRedisUrl as string,
                config.upstashRedisToken as string
            );
            return redisAdapter;
        }

        if (config.redisUrl) {
            console.log('[Session] Using local Redis (development).');
            redisAdapter = createIORedisAdapter(config.redisUrl as string);
            return redisAdapter;
        }

        console.warn('[Session] No Redis configured. Using in-memory store.');
        redisAdapter = null;
        return null;
    } catch (error) {
        console.warn('[Session] Failed to initialize Redis:', error);
        redisAdapter = null;
        return null;
    }
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

    const redis = getRedisAdapter();

    if (redis) {
        const key = getSessionKey(sessionId);
        const userKey = getUserSessionsKey(data.userId);

        await redis.set(key, JSON.stringify(session), SESSION_TTL_SECONDS);
        await redis.sadd(userKey, sessionId);
        await redis.expire(userKey, SESSION_TTL_SECONDS);
    } else {
        memoryStore.set(sessionId, session);
    }

    return sessionId;
}

export async function getSession(sessionId: string): Promise<Session | null> {
    const redis = getRedisAdapter();

    if (redis) {
        const key = getSessionKey(sessionId);
        const data = await redis.get(key);

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

    const redis = getRedisAdapter();

    if (redis) {
        const key = getSessionKey(sessionId);
        const remainingTtl = Math.floor(
            (session.expiresAt.getTime() - Date.now()) / 1000
        );

        if (remainingTtl > 0) {
            await redis.set(key, JSON.stringify(updatedSession), remainingTtl);
        }
    } else {
        memoryStore.set(sessionId, updatedSession);
    }

    return true;
}

export async function deleteSession(sessionId: string): Promise<boolean> {
    const session = await getSession(sessionId);

    if (!session) return false;

    const redis = getRedisAdapter();

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
    const redis = getRedisAdapter();

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
