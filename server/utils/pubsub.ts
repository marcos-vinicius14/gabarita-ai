/**
 * Redis Pub/Sub Utilities
 * 
 * Provides publisher instance for deck status events.
 * Works in worker context (separate from Nuxt).
 */

import Redis from 'ioredis';

let publisher: Redis | null = null;

function getRedisUrl(): string {
    return process.env.REDIS_URL || 'redis://localhost:6379';
}

export function getPublisher(): Redis {
    if (publisher) return publisher;

    publisher = new Redis(getRedisUrl());

    publisher.on('connect', () => {
        console.log('[PubSub] Publisher connected to Redis');
    });

    publisher.on('error', (err) => {
        console.error('[PubSub] Publisher error:', err.message);
    });

    return publisher;
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

export async function publishDeckStatus(
    deckId: string,
    userId: string,
    status: 'processing' | 'ready' | 'failed',
    options?: { progress?: string; errorMessage?: string }
): Promise<void> {
    const pub = getPublisher();

    const event: DeckStatusEvent = {
        type: 'deck:status',
        deckId,
        userId,
        status,
        progress: options?.progress,
        errorMessage: options?.errorMessage,
        timestamp: new Date().toISOString(),
    };

    await pub.publish('deck:status', JSON.stringify(event));
    console.log(`[PubSub] Published deck:status for ${deckId}: ${status}`);
}

export async function closePublisher(): Promise<void> {
    if (publisher) {
        await publisher.quit();
        publisher = null;
        console.log('[PubSub] Publisher closed');
    }
}
