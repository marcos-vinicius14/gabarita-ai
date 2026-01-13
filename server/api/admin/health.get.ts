/**
 * GET /api/admin/health
 *
 * Returns database health metrics for admin dashboard.
 * Requires admin authentication.
 */

import { Pool } from 'pg';
import {
    handleException,
    AuthenticationRequiredException,
    ForbiddenException,
} from '~/server/utils/exceptions';
import {
    type HealthStatus,
    formatBytes,
    getConnectionStatus,
    getQueueStatus,
    getTableSizeStatus,
} from '~/server/utils/health';

interface ConnectionMetrics {
    current: number;
    max: number;
    percentage: number;
    status: HealthStatus;
}

interface QueueMetrics {
    pending: number;
    oldestMinutes: number | null;
    status: HealthStatus;
}

interface TableSizeMetrics {
    bytes: number;
    formatted: string;
    status: HealthStatus;
}

interface HealthMetrics {
    connections: ConnectionMetrics;
    queue: QueueMetrics;
    tableSize: TableSizeMetrics;
    timestamp: string;
}

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user;

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        if (user.role !== 'admin') {
            throw new ForbiddenException('Você não tem permissão para acessar esta página.');
        }

        const config = useRuntimeConfig();
        const pool = new Pool({
            connectionString: config.databaseUrl as string,
            max: 1,
        });

        try {
            const connResult = await pool.query(`
                SELECT 
                    (SELECT count(*) FROM pg_stat_activity) as current,
                    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max
            `);
            const current = parseInt(connResult.rows[0].current);
            const max = parseInt(connResult.rows[0].max);
            const percentage = Math.round((current / max) * 100);

            let pending = 0;
            let oldestMinutes: number | null = null;

            try {
                const queueResult = await pool.query(`
                    SELECT 
                        count(*) as pending,
                        EXTRACT(EPOCH FROM (NOW() - MIN(created_on)))/60 as oldest_minutes
                    FROM pgboss.job 
                    WHERE state = 'created'
                `);
                pending = parseInt(queueResult.rows[0].pending) || 0;
                oldestMinutes = queueResult.rows[0].oldest_minutes
                    ? Math.round(parseFloat(queueResult.rows[0].oldest_minutes))
                    : null;
            } catch (err) {
                console.warn('[Health] pgboss.job query failed:', err);
            }

            let tableBytes = 0;
            try {
                const sizeResult = await pool.query(`
                    SELECT pg_total_relation_size('pgboss.job') as size_bytes
                `);
                tableBytes = parseInt(sizeResult.rows[0].size_bytes) || 0;
            } catch (err) {
                console.warn('[Health] pgboss table size query failed:', err);
            }

            const metrics: HealthMetrics = {
                connections: {
                    current,
                    max,
                    percentage,
                    status: getConnectionStatus(percentage),
                },
                queue: {
                    pending,
                    oldestMinutes,
                    status: getQueueStatus(pending, oldestMinutes),
                },
                tableSize: {
                    bytes: tableBytes,
                    formatted: formatBytes(tableBytes),
                    status: getTableSizeStatus(tableBytes),
                },
                timestamp: new Date().toISOString(),
            };

            return { success: true, data: metrics };
        } finally {
            await pool.end();
        }
    } catch (error) {
        return handleException(event, error);
    }
});
