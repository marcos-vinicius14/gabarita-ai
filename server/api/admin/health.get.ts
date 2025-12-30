/**
 * GET /api/admin/health
 * 
 * Returns database health metrics for admin dashboard.
 * Requires admin authentication.
 */

import { Pool } from 'pg';

type HealthStatus = 'healthy' | 'warning' | 'critical';

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

// Thresholds
const CONNECTION_WARNING = 70;
const CONNECTION_CRITICAL = 85;
const QUEUE_PENDING_WARNING = 50;
const QUEUE_PENDING_CRITICAL = 200;
const QUEUE_MINUTES_WARNING = 15;
const QUEUE_MINUTES_CRITICAL = 30;
const TABLE_SIZE_WARNING = 500 * 1024 * 1024; // 500MB
const TABLE_SIZE_CRITICAL = 1024 * 1024 * 1024; // 1GB

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getConnectionStatus(percentage: number): HealthStatus {
    if (percentage >= CONNECTION_CRITICAL) return 'critical';
    if (percentage >= CONNECTION_WARNING) return 'warning';
    return 'healthy';
}

function getQueueStatus(pending: number, oldestMinutes: number | null): HealthStatus {
    if (pending >= QUEUE_PENDING_CRITICAL) return 'critical';
    if (oldestMinutes !== null && oldestMinutes >= QUEUE_MINUTES_CRITICAL) return 'critical';
    if (pending >= QUEUE_PENDING_WARNING) return 'warning';
    if (oldestMinutes !== null && oldestMinutes >= QUEUE_MINUTES_WARNING) return 'warning';
    return 'healthy';
}

function getTableSizeStatus(bytes: number): HealthStatus {
    if (bytes >= TABLE_SIZE_CRITICAL) return 'critical';
    if (bytes >= TABLE_SIZE_WARNING) return 'warning';
    return 'healthy';
}

export default defineEventHandler(async (event) => {
    // Check admin auth
    const user = event.context.user;
    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' });
    }

    // Verify admin role (requires querying the database for the full user)
    if (user.role !== 'admin') {
        throw createError({ statusCode: 403, message: 'Admin access required' });
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
        } catch {
        }

        let tableBytes = 0;
        try {
            const sizeResult = await pool.query(`
                SELECT pg_total_relation_size('pgboss.job') as size_bytes
            `);
            tableBytes = parseInt(sizeResult.rows[0].size_bytes) || 0;
        } catch {
            // pgboss schema might not exist yet
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
});
