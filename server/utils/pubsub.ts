/**
 * PostgreSQL Pub/Sub Utilities
 *
 * Provides NOTIFY functionality for deck status events.
 * Uses PostgreSQL LISTEN/NOTIFY instead of Redis.
 */

import { Pool } from 'pg';

let publisherPool: Pool | null = null;

/**
 * Get database URL
 */
function getDatabaseUrl(): string {
    return process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/gabarita_ai';
}

/**
 * Get the publisher pool (shared connection pool for NOTIFY)
 */
export function getPublisher(): Pool {
    if (publisherPool) {
        return publisherPool;
    }

    publisherPool = new Pool({
        connectionString: getDatabaseUrl(),
        max: 5, // Small pool just for notifications
    });

    publisherPool.on('error', (err) => {
        console.error('[PubSub] Pool error:', err.message);
    });

    console.log('[PubSub] Publisher pool created');

    return publisherPool;
}

export interface DeckStatusEvent {
    type: 'deck:status';
    deckId: string;
    userId: string;
    status: 'processing' | 'ready' | 'failed';
    progress?: string;
    errorMessage?: string;
    timestamp: string;
}

/**
 * Publish a deck status event via PostgreSQL NOTIFY
 */
export async function publishDeckStatus(
    deckId: string,
    userId: string,
    status: 'processing' | 'ready' | 'failed',
    options?: { progress?: string; errorMessage?: string }
): Promise<void> {
    const pool = getPublisher();

    const event: DeckStatusEvent = {
        type: 'deck:status',
        deckId,
        userId,
        status,
        progress: options?.progress,
        errorMessage: options?.errorMessage,
        timestamp: new Date().toISOString(),
    };

    // Escape the JSON payload for PostgreSQL
    const payload = JSON.stringify(event);
    // Use parameterized query-like escaping by using pg_notify function
    await pool.query('SELECT pg_notify($1, $2)', ['deck_status', payload]);

    console.log(`[PubSub] Published deck:status for ${deckId}: ${status}`);
}

/**
 * Close the publisher pool (for graceful shutdown)
 */
export async function closePublisher(): Promise<void> {
    if (publisherPool) {
        await publisherPool.end();
        publisherPool = null;
        console.log('[PubSub] Publisher pool closed');
    }
}
