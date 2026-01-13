/**
 * Graphile Worker Queue Configuration
 *
 * Provides job queue utilities using PostgreSQL with LISTEN/NOTIFY.
 * Replaces pg-boss for better latency (~3ms vs polling).
 */

import { run, quickAddJob } from 'graphile-worker';
import type { Runner } from 'graphile-worker';
import { resolve } from 'path';

export const TASK_NAMES = {
    DECK_GENERATION: 'deck-generation',
} as const;


export interface DeckGenerationJobData {
    deckId: string;
    userId: string;
    r2Key: string;
    originalFilename: string;
}

let runner: Runner | null = null;

/**
 * Get database URL from environment
 */
function getDatabaseUrl(): string {
    // Prioritize DATABASE_URL from environment
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }

    // Try Nuxt runtime config in Nuxt context
    try {
        const config = useRuntimeConfig();
        if (config.databaseUrl) {
            return config.databaseUrl as string;
        }
    } catch {
        // Not in Nuxt context
    }

    throw new Error('DATABASE_URL environment variable is required');
}

/**
 * Start the Graphile Worker runner (for processing jobs)
 */
export async function startWorkerRunner(): Promise<Runner> {
    if (runner) {
        return runner;
    }

    const connectionString = getDatabaseUrl();
    const taskDirectory = resolve(__dirname, '../tasks');

    console.log('[Queue] Starting Graphile Worker...');
    console.log('[Queue] Task directory:', taskDirectory);

    runner = await run({
        connectionString,
        taskDirectory,
        concurrency: 5,
        pollInterval: 1000,
    });

    console.log('[Queue] Graphile Worker started');

    return runner;
}

/**
 * Add a deck generation job to the queue
 * Uses quickAddJob for one-off job additions without needing a runner
 */
export async function addDeckGenerationJob(jobData: DeckGenerationJobData): Promise<void> {
    const connectionString = getDatabaseUrl();

    await quickAddJob(
        { connectionString },
        TASK_NAMES.DECK_GENERATION,
        jobData,
        {
            jobKey: jobData.deckId,
            maxAttempts: 3,
        }
    );

    console.log(`[Queue] Added job for deck ${jobData.deckId}`);
}

/**
 * Get queue stats for monitoring
 */
export async function getQueueStats() {
    return {
        queue: TASK_NAMES.DECK_GENERATION,
        status: runner ? 'running' : 'stopped',
    };
}

/**
 * Stop the worker runner gracefully
 */
export async function closeQueue(): Promise<void> {
    if (runner) {
        await runner.stop();
        runner = null;
        console.log('[Queue] Graphile Worker stopped');
    }
}

export { runner };
