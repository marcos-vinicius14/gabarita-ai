/**
 * Database connection with environment-aware driver selection.
 * 
 * - Development: Uses node-postgres (pg) for local Docker PostgreSQL
 * - Production: Uses Neon WebSocket Pool for Cloudflare Workers/Pages
 * - Standalone Worker: Falls back to environment variables
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../db/schema';

// Get database URL - works both in Nuxt context and standalone worker
function getDatabaseUrl(): string {
    let dbUrl: string | undefined;

    try {
        // This will work in Nuxt context
        const config = useRuntimeConfig();
        dbUrl = config.databaseUrl as string;
    } catch {
        // Fall back to env vars for standalone worker
    }

    // Override with env var if set or not available from config
    dbUrl = dbUrl || process.env.DATABASE_URL;

    if (!dbUrl) {
        console.error('[DB Error] DATABASE_URL is missing.');
        throw new Error('DATABASE_URL is missing.');
    }

    return dbUrl;
}

const connString = getDatabaseUrl();

console.log('[DB] Initializing PostgreSQL connection...');

const pool = new pg.Pool({ connectionString: connString });

export const db = drizzle(pool, { schema });

