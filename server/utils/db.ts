/**
 * Database connection using Neon WebSocket Pool.
 * 
 * Optimized for Cloudflare Workers/Pages:
 * - WebSocket connection (stable on Cloudflare)
 * - Behaves like a standard Postgres client
 * - Bypasses tagged-template restriction of HTTP adapter
 */

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../db/schema';

const config = useRuntimeConfig();
const connString = config.databaseUrl || process.env.DATABASE_URL || '';

if (!connString) {
    console.error('[DB Error] DATABASE_URL is missing. Please check Cloudflare Environment Variables.');
    throw new Error('DATABASE_URL is missing. Please check Cloudflare Environment Variables.');
}

console.log('[DB] Initializing Neon WebSocket Pool connection...');

// Use the Pool for WebSocket connection (Stable on Cloudflare)
const pool = new Pool({ connectionString: connString });

export const db = drizzle(pool, { schema });
