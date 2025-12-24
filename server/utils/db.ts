/**
 * Database connection using Neon HTTP driver.
 * 
 * This approach is optimized for Cloudflare Workers/Pages:
 * - Stateless HTTP connections (no TCP handshake overhead)
 * - No connection pooling needed
 * - Sub-millisecond cold starts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

let _db: NeonHttpDatabase | null = null;

function createDatabaseClient(): NeonHttpDatabase {
    const config = useRuntimeConfig();

    const databaseUrl = config.databaseUrl;

    if (!databaseUrl) {
        console.error('[DB Error] DATABASE_URL is not configured. Check NUXT_DATABASE_URL in Cloudflare.');
        throw new Error('DATABASE_URL environment variable is not set.');
    }

    console.log('[DB] Initializing Neon HTTP database connection...');

    const sql = neon(databaseUrl);

    return drizzle(sql);
}

export const db = {
    get instance(): NeonHttpDatabase {
        if (!_db) {
            _db = createDatabaseClient();
        }
        return _db;
    }
};
