/**
 * BullMQ Queue Configuration
 * 
 * Provides queue instances and job helpers for async task processing.
 * Uses local Redis (Docker) for development and can be configured for production.
 */

import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq';

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

/**
 * Get Redis connection options - works both in Nuxt context and standalone worker
 */
function getRedisConnection(): ConnectionOptions {
    let redisUrl = 'redis://localhost:6379';

    try {
        // This will work in Nuxt context
        const config = useRuntimeConfig();
        if (config.redisUrl) {
            redisUrl = config.redisUrl as string;
        }
    } catch {
        // Fall back to env vars for standalone worker
    }

    // Override with env var if set
    redisUrl = process.env.REDIS_URL || redisUrl;

    // Parse Redis URL
    const url = new URL(redisUrl);

    return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        maxRetriesPerRequest: null, // Required for BullMQ
    };
}

// Singleton queue instances
let deckGenerationQueue: Queue<DeckGenerationJobData> | null = null;

/**
 * Get or create the deck generation queue
 */
export function getDeckGenerationQueue(): Queue<DeckGenerationJobData> {
    if (deckGenerationQueue) {
        return deckGenerationQueue;
    }

    const connection = getRedisConnection();

    deckGenerationQueue = new Queue<DeckGenerationJobData>(QUEUE_NAMES.DECK_GENERATION, {
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000, // 5s, 10s, 20s
            },
            removeOnComplete: {
                age: 24 * 3600, // Keep completed jobs for 24 hours
                count: 1000, // Keep last 1000 completed jobs
            },
            removeOnFail: {
                age: 7 * 24 * 3600, // Keep failed jobs for 7 days
            },
        },
    });

    console.log(`[Queue] Initialized ${QUEUE_NAMES.DECK_GENERATION} queue`);

    return deckGenerationQueue;
}

/**
 * Add a deck generation job to the queue
 * 
 * @param jobData - The job data containing deckId, userId, r2Key, and originalFilename
 * @returns The created job
 */
export async function addDeckGenerationJob(jobData: DeckGenerationJobData): Promise<Job<DeckGenerationJobData>> {
    const queue = getDeckGenerationQueue();

    const job = await queue.add(
        `process-deck-${jobData.deckId}`,
        jobData,
        {
            jobId: jobData.deckId,
        }
    );

    console.log(`[Queue] Added job ${job.id} for deck ${jobData.deckId}`);

    return job;
}

/**
 * Create a worker for the deck generation queue
 * This is exported for use in the worker process
 * 
 * @param processor - The function to process each job
 * @returns The worker instance
 */
export function createDeckGenerationWorker(
    processor: (job: Job<DeckGenerationJobData>) => Promise<void>
): Worker<DeckGenerationJobData> {
    const connection = getRedisConnection();

    const worker = new Worker<DeckGenerationJobData>(
        QUEUE_NAMES.DECK_GENERATION,
        processor,
        {
            connection,
            concurrency: 2, // Process 2 jobs at a time
        }
    );

    worker.on('completed', (job) => {
        console.log(`[Worker] Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, error) => {
        console.error(`[Worker] Job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
        console.error('[Worker] Error:', error);
    });

    console.log(`[Worker] Started worker for ${QUEUE_NAMES.DECK_GENERATION}`);

    return worker;
}

/**
 * Get queue stats for monitoring
 */
export async function getQueueStats() {
    const queue = getDeckGenerationQueue();

    const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
    ]);

    return {
        queue: QUEUE_NAMES.DECK_GENERATION,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + delayed,
    };
}

/**
 * Close queue connections (for graceful shutdown)
 */
export async function closeQueues(): Promise<void> {
    if (deckGenerationQueue) {
        await deckGenerationQueue.close();
        deckGenerationQueue = null;
        console.log('[Queue] Closed deck generation queue');
    }
}
