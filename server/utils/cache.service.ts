/**
 * Cache Service
 *
 * Generic cache service using PostgreSQL UNLOGGED table via Drizzle ORM.
 * Implements Cache-Aside pattern with configurable TTL.
 *
 * Default TTL: 3 minutes
 */

import { eq, gt, lt, like, sql } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { cache } from '~/server/db/tables/cache';

const DEFAULT_TTL_SECONDS = 180;

/**
 * Get a value from cache
 */
export async function get<T>(key: string): Promise<T | null> {
    const result = await db
        .select({ value: cache.value })
        .from(cache)
        .where(
            sql`${cache.key} = ${key} AND ${cache.expiresAt} > NOW()`
        );

    if (result.length === 0) return null;

    return result[0].value as T;
}

/**
 * Set a value in cache
 */
export async function set<T>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await db
        .insert(cache)
        .values({
            key,
            value: value as any, // Drizzle JSONB types can be tricky
            expiresAt,
        })
        .onConflictDoUpdate({
            target: cache.key,
            set: {
                value: value as any,
                expiresAt,
            },
        });
}

/**
 * Delete a value from cache
 */
export async function del(key: string): Promise<void> {
    await db
        .delete(cache)
        .where(eq(cache.key, key));
}

/**
 * Delete all cache entries matching a prefix
 */
export async function delByPrefix(prefix: string): Promise<number> {
    const result = await db
        .delete(cache)
        .where(like(cache.key, `${prefix}%`))
        .returning({ key: cache.key });

    return result.length;
}

/**
 * Get or set pattern (Cache-Aside)
 * Returns cached value if exists, otherwise calls fetcher and caches result
 */
export async function getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<T> {
    // 1. Try to get from cache
    const cached = await get<T>(key);
    if (cached !== null) {
        return cached;
    }

    // 2. Fetch fresh data
    const value = await fetcher();

    // 3. Cache only valid data (not null/undefined)
    if (value !== null && value !== undefined) {
        await set(key, value, ttlSeconds);
    }

    return value;
}

/**
 * Clean up expired cache entries
 */
export async function cleanup(): Promise<number> {
    const result = await db
        .delete(cache)
        .where(sql`${cache.expiresAt} < NOW()`)
        .returning({ key: cache.key });

    return result.length;
}
