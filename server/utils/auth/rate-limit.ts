/**
 * Rate Limiting Utilities
 *
 * Uses PostgreSQL for rate limiting (Postgres Everything approach).
 * Implements exponential backoff for failed login attempts.
 *
 * Rate Limit Rules:
 * - 5 failed attempts: 1 minute block
 * - 10 failed attempts: 5 minutes block
 * - 15+ failed attempts: 15 minutes block
 */

import { Pool } from 'pg';

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

let pool: Pool | null | undefined = undefined;
let tableInitialized = false;

function getDatabaseUrl(): string | null {
    try {
        const config = useRuntimeConfig();
        if (config.databaseUrl) {
            return config.databaseUrl as string;
        }
    } catch {
        // Fall back to env var
    }
    return process.env.DATABASE_URL || null;
}

function getPool(): Pool | null {
    if (pool !== undefined) {
        return pool;
    }

    const dbUrl = getDatabaseUrl();
    if (!dbUrl) {
        console.warn('[RateLimit] DATABASE_URL not configured. Rate limiting disabled.');
        pool = null;
        return null;
    }

    pool = new Pool({
        connectionString: dbUrl,
        max: 3,
    });

    return pool;
}

async function ensureTable(): Promise<void> {
    if (tableInitialized) return;

    const p = getPool();
    if (!p) return;

    try {
        // Check if table exists
        const tableCheck = await p.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'rate_limits'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            // Create as UNLOGGED for better performance (data lost on crash is acceptable)
            await p.query(`
                CREATE UNLOGGED TABLE rate_limits (
                    key VARCHAR(255) PRIMARY KEY,
                    attempts INT NOT NULL DEFAULT 0,
                    blocked_until TIMESTAMPTZ,
                    expires_at TIMESTAMPTZ NOT NULL
                );
                
                CREATE INDEX idx_rate_limits_expires ON rate_limits(expires_at);
            `);
            console.log('[RateLimit] UNLOGGED rate_limits table created.');
        }

        tableInitialized = true;
    } catch (error) {
        console.error('[RateLimit] Failed to initialize table:', error);
    }
}

function getRateLimitKey(identifier: string, action: string): string {
    return `${action}:${identifier}`;
}

/**
 * Checks if an identifier is rate limited
 *
 * @param identifier - IP address or user ID
 * @param action - Action being performed (e.g., 'login')
 * @throws RateLimitError if rate limited
 */
export async function checkRateLimit(identifier: string, action: string): Promise<void> {
    const p = getPool();

    if (!p) {
        return;
    }

    await ensureTable();

    const key = getRateLimitKey(identifier, action);

    const result = await p.query<{ blocked_until: Date | null }>(
        'SELECT blocked_until FROM rate_limits WHERE key = $1',
        [key]
    );

    if (result.rows.length === 0) return;

    const blockedUntil = result.rows[0].blocked_until;
    if (blockedUntil && blockedUntil > new Date()) {
        const retryAfter = Math.ceil((blockedUntil.getTime() - Date.now()) / 1000);
        throw new RateLimitError(retryAfter);
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
    const p = getPool();

    if (!p) {
        return 0;
    }

    await ensureTable();

    const key = getRateLimitKey(identifier, action);
    const expiresAt = new Date(Date.now() + RATE_LIMIT_CONFIG.windowSeconds * 1000);

    // Upsert the rate limit record
    const result = await p.query<{ attempts: number }>(
        `INSERT INTO rate_limits (key, attempts, expires_at)
         VALUES ($1, 1, $2)
         ON CONFLICT (key)
         DO UPDATE SET attempts = rate_limits.attempts + 1, expires_at = $2
         RETURNING attempts`,
        [key, expiresAt]
    );

    const attempts = result.rows[0].attempts;

    // Check if we need to block
    const blockThresholds = Object.keys(RATE_LIMIT_CONFIG.blockDurations)
        .map(Number)
        .sort((a, b) => b - a);

    for (const threshold of blockThresholds) {
        if (attempts >= threshold) {
            const blockDuration = RATE_LIMIT_CONFIG.blockDurations[threshold];
            const blockedUntil = new Date(Date.now() + blockDuration * 1000);

            await p.query(
                'UPDATE rate_limits SET blocked_until = $1 WHERE key = $2',
                [blockedUntil, key]
            );
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
    const p = getPool();

    if (!p) {
        return;
    }

    await ensureTable();

    const key = getRateLimitKey(identifier, action);
    await p.query('DELETE FROM rate_limits WHERE key = $1', [key]);
}

/**
 * Gets remaining attempts before rate limit
 *
 * @param identifier - IP address or user ID
 * @param action - Action being performed
 * @returns Remaining attempts (null if database not configured)
 */
export async function getRemainingAttempts(identifier: string, action: string): Promise<number | null> {
    const p = getPool();

    if (!p) {
        return null;
    }

    await ensureTable();

    const key = getRateLimitKey(identifier, action);

    const result = await p.query<{ attempts: number }>(
        'SELECT attempts FROM rate_limits WHERE key = $1',
        [key]
    );

    const attempts = result.rows[0]?.attempts || 0;
    return Math.max(0, RATE_LIMIT_CONFIG.maxAttempts - attempts);
}

/**
 * Clean up expired rate limit records (call periodically)
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
    const p = getPool();

    if (!p) {
        return 0;
    }

    await ensureTable();

    const result = await p.query('DELETE FROM rate_limits WHERE expires_at < NOW()');
    return result.rowCount || 0;
}
