/**
 * Session Store
 *
 * Server-side session management for BFF pattern.
 * Tokens are stored server-side, never exposed to the client.
 *
 * Storage: PostgreSQL (Postgres Everything approach)
 * Falls back to in-memory Map if database is not available.
 */

import { Pool } from 'pg';
import { useRuntimeConfig } from '#imports';
import { generateRandomToken } from './tokens';

export interface Session {
    id: string;
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    createdAt: Date;
}

interface SessionData {
    userId: string;
    accessToken: string;
    refreshToken: string;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const memoryStore = new Map<string, Session>();

let pgPool: Pool | null | undefined = undefined;
let isTableInitialized = false;

/**
 * Get database URL
 */
function getDatabaseUrl(): string | null {
    try {
        const config = useRuntimeConfig();
        if (config.databaseUrl) {
            return config.databaseUrl as string;
        }
    } catch {
        // Fall back to env vars
    }

    return process.env.DATABASE_URL || null;
}

function getPool(): Pool | null {
    if (pgPool !== undefined) {
        return pgPool;
    }

    const dbUrl = getDatabaseUrl();
    if (!dbUrl) {
        console.warn('[Session] No DATABASE_URL configured. Using in-memory store.');
        pgPool = null;
        return null;
    }

    try {
        pgPool = new Pool({
            connectionString: dbUrl,
            max: 5,
        });

        console.log('[Session] Using PostgreSQL for session storage.');
        return pgPool;
    } catch (error) {
        console.warn('[Session] Failed to create PostgreSQL pool:', error);
        pgPool = null;
        return null;
    }
}

async function ensureTable(): Promise<void> {
    if (isTableInitialized) return;

    const pool = getPool();
    if (!pool) return;

    try {
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'sessions'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            await pool.query(`
                CREATE UNLOGGED TABLE sessions (
                    id VARCHAR(64) PRIMARY KEY,
                    user_id VARCHAR(36) NOT NULL,
                    access_token TEXT NOT NULL,
                    refresh_token TEXT NOT NULL,
                    expires_at TIMESTAMPTZ NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                
                CREATE INDEX idx_sessions_user_id ON sessions(user_id);
                CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
            `);
            console.log('[Session] UNLOGGED sessions table created.');
        }

        isTableInitialized = true;
    } catch (error) {
        console.error('[Session] Failed to initialize sessions table:', error);
    }
}

function generateSessionId(): string {
    return generateRandomToken(32);
}

export async function createSession(data: SessionData): Promise<string> {
    const sessionId = generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

    const session: Session = {
        id: sessionId,
        userId: data.userId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt,
        createdAt: now,
    };

    const pool = getPool();

    if (pool) {
        await ensureTable();
        await pool.query(
            `INSERT INTO sessions (id, user_id, access_token, refresh_token, expires_at, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [sessionId, data.userId, data.accessToken, data.refreshToken, expiresAt, now]
        );
    } else {
        memoryStore.set(sessionId, session);
    }

    return sessionId;
}

export async function getSession(sessionId: string): Promise<Session | null> {
    const pool = getPool();

    if (pool) {
        await ensureTable();
        const result = await pool.query(
            `SELECT id, user_id, access_token, refresh_token, expires_at, created_at
             FROM sessions
             WHERE id = $1 AND expires_at > NOW()`,
            [sessionId]
        );

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            id: row.id,
            userId: row.user_id,
            accessToken: row.access_token,
            refreshToken: row.refresh_token,
            expiresAt: new Date(row.expires_at),
            createdAt: new Date(row.created_at),
        };
    }

    const session = memoryStore.get(sessionId);

    if (!session) return null;

    if (session.expiresAt < new Date()) {
        memoryStore.delete(sessionId);
        return null;
    }

    return session;
}

export async function updateSession(
    sessionId: string,
    data: Partial<Pick<Session, 'accessToken' | 'refreshToken'>>
): Promise<boolean> {
    const session = await getSession(sessionId);

    if (!session) return false;

    const pool = getPool();

    if (pool) {
        await ensureTable();

        const updates: string[] = [];
        const values: (string | undefined)[] = [];
        let paramIndex = 1;

        if (data.accessToken !== undefined) {
            updates.push(`access_token = $${paramIndex++}`);
            values.push(data.accessToken);
        }
        if (data.refreshToken !== undefined) {
            updates.push(`refresh_token = $${paramIndex++}`);
            values.push(data.refreshToken);
        }

        if (updates.length === 0) return true;

        values.push(sessionId);
        await pool.query(
            `UPDATE sessions SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
            values
        );
    } else {
        const updatedSession: Session = {
            ...session,
            ...data,
        };
        memoryStore.set(sessionId, updatedSession);
    }

    return true;
}

export async function deleteSession(sessionId: string): Promise<boolean> {
    const session = await getSession(sessionId);

    if (!session) return false;

    const pool = getPool();

    if (pool) {
        await ensureTable();
        await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    } else {
        memoryStore.delete(sessionId);
    }

    return true;
}

export async function deleteUserSessions(userId: string): Promise<number> {
    const pool = getPool();

    if (pool) {
        await ensureTable();
        const result = await pool.query(
            'DELETE FROM sessions WHERE user_id = $1',
            [userId]
        );
        return result.rowCount || 0;
    }

    let count = 0;
    for (const [id, session] of memoryStore) {
        if (session.userId === userId) {
            memoryStore.delete(id);
            count++;
        }
    }

    return count;
}

/**
 * Clean up expired sessions (call periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
    const pool = getPool();

    if (pool) {
        await ensureTable();
        const result = await pool.query(
            'DELETE FROM sessions WHERE expires_at < NOW()'
        );
        return result.rowCount || 0;
    }

    let count = 0;
    const now = new Date();
    for (const [id, session] of memoryStore) {
        if (session.expiresAt < now) {
            memoryStore.delete(id);
            count++;
        }
    }

    return count;
}
