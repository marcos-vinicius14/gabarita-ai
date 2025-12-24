/**
 * Database connection using Neon HTTP driver.
 * 
 * Optimized for Cloudflare Workers/Pages:
 * - Stateless HTTP connections
 * - No TCP handshake overhead
 * - Sub-millisecond cold starts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';

// 1. Get the connection string safely
const config = useRuntimeConfig();
const connString = config.databaseUrl || process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL || '';

if (!connString) {
    console.error('[DB Error] DATABASE_URL is not defined. Check NUXT_DATABASE_URL in Cloudflare.');
    throw new Error('DATABASE_URL is not defined');
}

console.log('[DB] Initializing Neon HTTP connection...');

// 2. Initialize the HTTP client
const sql = neon(connString);

// 3. Initialize Drizzle with the HTTP adapter
export const db = drizzle(sql, { schema });
