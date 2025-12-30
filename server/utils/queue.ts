/**
 * pg-boss Queue Configuration
 *
 * Provides queue instance and job helpers for async task processing.
 * Uses PostgreSQL as the job queue backend (Postgres Everything approach).
 */

import { PgBoss } from 'pg-boss';

// Queue names as constants for type safety
export const QUEUE_NAMES = {
    DECK_GENERATION: 'deck-generation',
} as const;

/**
 * Job data for deck generation from PDF upload
 */
export interface DeckGenerationJobData {
    deckId: string;
    userId: string;
    r2Key: string;
    originalFilename: string;
}

// Singleton boss instance
let boss: PgBoss | null = null;

/**
 * Get database URL - works both in Nuxt context and standalone worker
 */
function getDatabaseUrl(): string {
    let dbUrl = 'postgres://user:password@localhost:5432/gabarita_ai';

    try {
        // This will work in Nuxt context
        const config = useRuntimeConfig();
        if (config.databaseUrl) {
            dbUrl = config.databaseUrl as string;
        }
    } catch {
        // Fall back to env vars for standalone worker
    }

    // Override with env var if set
    return process.env.DATABASE_URL || dbUrl;
}

/**
 * Get or create the pg-boss instance
 */
export function getBoss(): PgBoss {
    if (boss) {
        return boss;
    }

    const connectionString = getDatabaseUrl();

    boss = new PgBoss({
        connectionString,
        // Schema for pg-boss tables (isolated from app tables)
        schema: 'pgboss',
    });

    boss.on('error', (error) => {
        console.error('[Queue] pg-boss error:', error);
    });

    console.log('[Queue] pg-boss instance created');

    return boss;
}

/**
 * Start pg-boss (must be called before adding/processing jobs)
 */
export async function startQueue(): Promise<PgBoss> {
    const bossInstance = getBoss();
    await bossInstance.start();

    // pg-boss v12 requires explicit queue creation
    await bossInstance.createQueue(QUEUE_NAMES.DECK_GENERATION);

    console.log(`[Queue] pg-boss started, queue created`);
    return bossInstance;
}

let queueStarted = false;

/**
 * Ensure pg-boss is started before sending jobs
 */
async function ensureStarted(): Promise<PgBoss> {
    const bossInstance = getBoss();
    if (!queueStarted) {
        await bossInstance.start();
        await bossInstance.createQueue(QUEUE_NAMES.DECK_GENERATION);
        queueStarted = true;
        console.log(`[Queue] pg-boss initialized`);
    }
    return bossInstance;
}

/**
 * Add a deck generation job to the queue
 *
 * @param jobData - The job data containing deckId, userId, r2Key, and originalFilename
 * @returns The created job ID
 */
export async function addDeckGenerationJob(jobData: DeckGenerationJobData): Promise<string | null> {
    const bossInstance = await ensureStarted();

    const jobId = await bossInstance.send(
        QUEUE_NAMES.DECK_GENERATION,
        jobData,
        {
            singletonKey: jobData.deckId,
            retryLimit: 3,
            retryDelay: 5,
            retryBackoff: true,
        }
    );

    console.log(`[Queue] Added job ${jobId} for deck ${jobData.deckId}`);

    return jobId;
}

/**
 * Get queue stats for monitoring
 */
export async function getQueueStats() {
    const bossInstance = getBoss();

    // pg-boss doesn't have built-in stats, but we can query the job table
    // For now, return a simple status
    return {
        queue: QUEUE_NAMES.DECK_GENERATION,
        status: 'running',
    };
}


export async function closeQueue(): Promise<void> {
    if (boss) {
        await boss.stop({ graceful: true });
        boss = null;
        console.log('[Queue] pg-boss stopped');
    }
}

export { boss };
