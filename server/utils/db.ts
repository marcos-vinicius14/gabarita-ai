import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

let _db: PostgresJsDatabase | null = null;

function createDatabaseClient(): PostgresJsDatabase {
    const config = useRuntimeConfig();

    if (!config.databaseUrl) {
        console.error('[DB Error] DATABASE_URL is not configured. Check NUXT_DATABASE_URL in Cloudflare.');
        throw new Error('DATABASE_URL environment variable is not set.');
    }

    console.log('[DB] Initializing database connection...');

    const isNeonDatabase = config.databaseUrl.includes('neon.tech');

    const client = postgres(config.databaseUrl, {
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
        ssl: isNeonDatabase ? 'require' : undefined,
    });

    return drizzle(client);
}

export const db = {
    get instance(): PostgresJsDatabase {
        if (!_db) {
            _db = createDatabaseClient();
        }
        return _db;
    }
};
