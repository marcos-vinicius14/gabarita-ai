/**
 * Cache Repository
 *
 * Responsibility: Database operations for the cache table.
 * Encapsulates all Drizzle ORM logic.
 */

import { eq, like, sql } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { cache } from '~/server/db/tables/cache';


export async function findByKey<T>(key: string): Promise<T | null> {
    const result = await db
        .select({ value: cache.value })
        .from(cache)
        .where(
            sql`${cache.key} = ${key} AND ${cache.expiresAt} > NOW()`
        );

    if (result.length === 0) return null;

    return result[0].value as T;
}

export async function upsert<T>(key: string, value: T, expiresAt: Date): Promise<void> {
    await db
        .insert(cache)
        .values({
            key,
            value: value as any,
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

export async function deleteByKey(key: string): Promise<void> {
    await db
        .delete(cache)
        .where(eq(cache.key, key));
}

export async function deleteByPrefix(prefix: string): Promise<number> {
    const result = await db
        .delete(cache)
        .where(like(cache.key, `${prefix}%`))
        .returning({ key: cache.key });

    return result.length;
}

export async function deleteExpired(): Promise<number> {
    const result = await db
        .delete(cache)
        .where(sql`${cache.expiresAt} < NOW()`)
        .returning({ key: cache.key });

    return result.length;
}
