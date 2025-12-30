/**
 * PostgreSQL Subscriber Utilities
 *
 * Provides LISTEN functionality for receiving real-time events.
 * Uses a dedicated connection for each subscriber (required by LISTEN).
 */

import { Client } from 'pg';

export type NotificationHandler = (payload: string) => void;

/**
 * Get database URL
 */
function getDatabaseUrl(): string {
    return process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/gabarita_ai';
}

/**
 * Create a subscriber that listens to a PostgreSQL channel
 * 
 * Note: Each LISTEN requires a dedicated connection that stays open.
 * This is different from pooled connections.
 *
 * @param channel - The PostgreSQL channel to listen to
 * @param handler - Callback function when a notification is received
 * @returns The pg Client instance (for cleanup)
 */
export async function createSubscriber(
    channel: string,
    handler: NotificationHandler
): Promise<Client> {
    const client = new Client({
        connectionString: getDatabaseUrl(),
    });

    await client.connect();
    console.log(`[Subscriber] Connected to PostgreSQL`);

    await client.query(`LISTEN ${channel}`);
    console.log(`[Subscriber] Listening to channel: ${channel}`);

    client.on('notification', (msg) => {
        if (msg.channel === channel && msg.payload) {
            handler(msg.payload);
        }
    });

    client.on('error', (err) => {
        console.error(`[Subscriber] Client error:`, err.message);
    });

    client.on('end', () => {
        console.log(`[Subscriber] Connection closed`);
    });

    return client;
}

/**
 * Close a subscriber connection
 */
export async function closeSubscriber(client: Client): Promise<void> {
    try {
        await client.end();
        console.log('[Subscriber] Client closed');
    } catch (err) {
        console.error('[Subscriber] Error closing client:', err);
    }
}
