/**
 * Graphile Worker Startup Script
 *
 * Starts the worker that processes background jobs.
 * Uses Graphile Worker with LISTEN/NOTIFY for low-latency job pickup.
 *
 * Run with: pnpm worker
 */

import 'dotenv/config';
import { run } from 'graphile-worker';
import type { Runner } from 'graphile-worker';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { closePublisher } from '../utils/pubsub';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    console.log('[Worker] Starting Graphile Worker...');

    const connectionString = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/gabarita_ai';
    const taskDirectory = resolve(__dirname, '../tasks');

    console.log('[Worker] Task directory:', taskDirectory);
    console.log('[Worker] Using LISTEN/NOTIFY for instant job pickup');

    const runner: Runner = await run({
        connectionString,
        taskDirectory,
        concurrency: 5,
        pollInterval: 1000,
    });

    console.log('[Worker] Graphile Worker started and listening for jobs');

    // Graceful shutdown
    const shutdown = async () => {
        console.log('[Worker] Shutting down...');
        await runner.stop();
        await closePublisher();
        console.log('[Worker] Shutdown complete');
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Keep the process running
    await runner.promise;
}

main().catch((error) => {
    console.error('[Worker] Failed to start:', error);
    process.exit(1);
});
