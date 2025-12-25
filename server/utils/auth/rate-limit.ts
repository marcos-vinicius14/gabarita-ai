/**
 * Rate Limiting Utilities
 * 
 * Uses Upstash Redis for Edge-compatible rate limiting.
 * Implements exponential backoff for failed login attempts.
 * 
 * Rate Limit Rules:
 * - 5 failed attempts: 1 minute block
 * - 10 failed attempts: 5 minutes block
 * - 15+ failed attempts: 15 minutes block
 */

import { Redis } from '@upstash/redis';
const RATE_LIMIT_CONFIG = {
    maxAttempts: 5,
    windowSeconds: 60 * 15,
    blockDurations: {
        5: 60,
        10: 5 * 60,
        15: 15 * 60,
    } as Record<number, number>,
};

export class RateLimitError extends Error {
    public readonly retryAfter: number;

    constructor(retryAfter: number) {
        super('Você excedeu o limite de tentativas. Tente novamente mais tarde.');
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
}

function getRedisClient(): Redis | null {
    const config = useRuntimeConfig();

    if (!config.upstashRedisUrl || !config.upstashRedisToken) {
        console.warn('[RateLimit] Redis not configured. Rate limiting disabled.');
        return null;
    }

    return new Redis({
        url: config.upstashRedisUrl,
        token: config.upstashRedisToken,
    });
}

function getRateLimitKey(identifier: string, action: string): string {
    return `ratelimit:${action}:${identifier}`;
}

/**
 * Checks if an identifier is rate limited
 * 
 * @param identifier - IP address or user ID
 * @param action - Action being performed (e.g., 'login')
 * @throws RateLimitError if rate limited
 */
export async function checkRateLimit(identifier: string, action: string): Promise<void> {
    const redis = getRedisClient();

    if (!redis) {
        return;
    }

    const key = getRateLimitKey(identifier, action);
    const blockKey = `${key}:blocked`;

    const blockedUntil = await redis.get<number>(blockKey);

    if (blockedUntil) {
        const now = Math.floor(Date.now() / 1000);
        if (blockedUntil > now) {
            throw new RateLimitError(blockedUntil - now);
        }
    }
}

/**
 * Increments failed attempt counter
 * 
 * @param identifier - IP address or user ID
 * @param action - Action being performed
 * @returns Current attempt count
 */
export async function incrementFailedAttempt(identifier: string, action: string): Promise<number> {
    const redis = getRedisClient();

    if (!redis) {
        return 0;
    }

    const key = getRateLimitKey(identifier, action);
    const attempts = await redis.incr(key);
    if (attempts === 1) {
        await redis.expire(key, RATE_LIMIT_CONFIG.windowSeconds);
    }

    const blockThresholds = Object.keys(RATE_LIMIT_CONFIG.blockDurations)
        .map(Number)
        .sort((a, b) => b - a);

    for (const threshold of blockThresholds) {
        if (attempts >= threshold) {
            const blockDuration = RATE_LIMIT_CONFIG.blockDurations[threshold];
            const blockUntil = Math.floor(Date.now() / 1000) + blockDuration;

            await redis.set(`${key}:blocked`, blockUntil, { ex: blockDuration });
            break;
        }
    }

    return attempts;
}

/**
 * Resets rate limit counter after successful action
 * 
 * @param identifier - IP address or user ID
 * @param action - Action being performed
 */
export async function resetRateLimit(identifier: string, action: string): Promise<void> {
    const redis = getRedisClient();

    if (!redis) {
        return;
    }

    const key = getRateLimitKey(identifier, action);

    await redis.del(key);
    await redis.del(`${key}:blocked`);
}

/**
 * Gets remaining attempts before rate limit
 * 
 * @param identifier - IP address or user ID
 * @param action - Action being performed
 * @returns Remaining attempts (null if Redis not configured)
 */
export async function getRemainingAttempts(identifier: string, action: string): Promise<number | null> {
    const redis = getRedisClient();

    if (!redis) {
        return null;
    }

    const key = getRateLimitKey(identifier, action);
    const attempts = await redis.get<number>(key) || 0;

    return Math.max(0, RATE_LIMIT_CONFIG.maxAttempts - attempts);
}
