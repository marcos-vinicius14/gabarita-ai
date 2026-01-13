/**
 * Session Cleanup Task (Graphile Worker)
 *
 * Removes expired sessions from the database.
 * Scheduled to run every hour via crontab.
 */

import type { Task } from 'graphile-worker';
import { cleanupExpiredSessions } from '../utils/auth/session';
import { cleanup as cleanupCache } from '../utils/cache.service';

const task: Task = async (_payload, helpers) => {
    const { logger } = helpers;

    logger.info('[Cleanup] Starting session and cache cleanup...');

    const [sessionCount, cacheCount] = await Promise.all([
        cleanupExpiredSessions(),
        cleanupCache(),
    ]);

    logger.info(`[Cleanup] Removed ${sessionCount} expired sessions`);
    logger.info(`[Cleanup] Removed ${cacheCount} expired cache entries`);
};

export default task;
