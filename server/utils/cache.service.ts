/**
 * Cache Service
 *
 * Generic cache service.
 * Responsibility: Business logic for caching (TTL calculation, Cache-Aside orchestration).
 * Delegates persistence to Cache Repository.
 *
 * Default TTL: 3 minutes
 */

import * as cacheRepository from '~/server/domain/cache/cache.repository';

const DEFAULT_TTL_SECONDS = 180;


export async function get<T>(key: string): Promise<T | null> {
    return cacheRepository.findByKey<T>(key);
}


export async function set<T>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await cacheRepository.upsert(key, value, expiresAt);
}


export async function del(key: string): Promise<void> {
    await cacheRepository.deleteByKey(key);
}

export async function delByPrefix(prefix: string): Promise<number> {
    return cacheRepository.deleteByPrefix(prefix);
}

export async function getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<T> {
    const cached = await get<T>(key);
    if (cached !== null) {
        return cached;
    }

    const value = await fetcher();

    if (value !== null && value !== undefined) {
        await set(key, value, ttlSeconds);
    }

    return value;
}

export async function cleanup(): Promise<number> {
    return cacheRepository.deleteExpired();
}
