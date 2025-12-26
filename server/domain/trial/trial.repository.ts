/**
 * Trial Repository
 * 
 * Single Responsibility: Database operations for trial management.
 */

import { eq } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { users } from '~/server/domain/auth/schema';
import type { UserRole } from '~/server/domain/auth/auth.types';

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Updates user role and trial expiry date
 */
export async function updateUserRoleAndTrial(
    userId: string,
    role: UserRole,
    trialExpiresAt: Date | null
): Promise<void> {
    await (db as any).update(users)
        .set({
            role,
            trialExpiresAt,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

/**
 * Downgrades user from trial to free
 */
export async function downgradeToFree(userId: string): Promise<void> {
    await (db as any).update(users)
        .set({
            role: 'free',
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}
