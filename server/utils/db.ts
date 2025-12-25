/**
 * Database connection with environment-aware driver selection.
 * 
 * - Development: Uses node-postgres (pg) for local Docker PostgreSQL
 * - Production: Uses Neon WebSocket Pool for Cloudflare Workers/Pages
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../db/schema';

const config = useRuntimeConfig();
const connString = config.databaseUrl || process.env.DATABASE_URL || '';

if (!connString) {
    console.error('[DB Error] DATABASE_URL is missing.');
    throw new Error('DATABASE_URL is missing.');
}

console.log('[DB] Initializing PostgreSQL connection...');

const pool = new pg.Pool({ connectionString: connString });

export const db = drizzle(pool, { schema });
