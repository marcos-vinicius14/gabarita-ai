/**
 * Health Metrics Utilities
 *
 * Helper functions for calculating and formatting health metrics.
 */

export type HealthStatus = 'healthy' | 'warning' | 'critical';

// Thresholds
export const THRESHOLDS = {
    CONNECTION_WARNING: 70,
    CONNECTION_CRITICAL: 85,
    QUEUE_PENDING_WARNING: 50,
    QUEUE_PENDING_CRITICAL: 200,
    QUEUE_MINUTES_WARNING: 15,
    QUEUE_MINUTES_CRITICAL: 30,
    TABLE_SIZE_WARNING: 500 * 1024 * 1024,
    TABLE_SIZE_CRITICAL: 1024 * 1024 * 1024,
} as const;

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getConnectionStatus(percentage: number): HealthStatus {
    if (percentage >= THRESHOLDS.CONNECTION_CRITICAL) return 'critical';
    if (percentage >= THRESHOLDS.CONNECTION_WARNING) return 'warning';
    return 'healthy';
}

export function getQueueStatus(pending: number, oldestMinutes: number | null): HealthStatus {
    if (pending >= THRESHOLDS.QUEUE_PENDING_CRITICAL) return 'critical';
    if (oldestMinutes !== null && oldestMinutes >= THRESHOLDS.QUEUE_MINUTES_CRITICAL) return 'critical';
    if (pending >= THRESHOLDS.QUEUE_PENDING_WARNING) return 'warning';
    if (oldestMinutes !== null && oldestMinutes >= THRESHOLDS.QUEUE_MINUTES_WARNING) return 'warning';
    return 'healthy';
}

export function getTableSizeStatus(bytes: number): HealthStatus {
    if (bytes >= THRESHOLDS.TABLE_SIZE_CRITICAL) return 'critical';
    if (bytes >= THRESHOLDS.TABLE_SIZE_WARNING) return 'warning';
    return 'healthy';
}
