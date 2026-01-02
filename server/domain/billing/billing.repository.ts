/**
 * Billing Repository
 * 
 * Single Responsibility: Database operations for billing.
 * Handles credit transactions, usage tracking, and quota resets.
 */

import { eq, sql } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { users } from '~/server/domain/auth/schema/users';
import { creditTransactions } from '~/server/db/tables/credit-transactions';
import type { UserBillingInfo, CreditTransaction } from './billing.types';

// ============================================================================
// User Billing Info
// ============================================================================

export async function getUserBillingInfo(userId: string): Promise<UserBillingInfo | null> {
    const result = await (db as any)
        .select({
            id: users.id,
            role: users.role,
            credits: users.credits,
            monthlyUploadsUsed: users.monthlyUploadsUsed,
            monthlyUploadsResetAt: users.monthlyUploadsResetAt,
            trialExpiresAt: users.trialExpiresAt,
            subscriptionStatus: users.subscriptionStatus,
            subscriptionPlanId: users.subscriptionPlanId,
            subscriptionEndsAt: users.subscriptionEndsAt,
        })
        .from(users)
        .where(eq(users.id, userId));

    return result[0] ?? null;
}

// ============================================================================
// Credits Management
// ============================================================================

export async function addCredits(
    userId: string,
    amount: number,
    type: 'purchase' | 'bonus' | 'refund',
    description: string,
    metadata?: Record<string, unknown>
): Promise<number> {
    // Update user credits
    const userResult = await (db as any)
        .update(users)
        .set({
            credits: sql`${users.credits} + ${amount}`,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({ credits: users.credits });

    // Log transaction
    await (db as any)
        .insert(creditTransactions)
        .values({
            userId,
            type,
            amount,
            description,
            metadata: metadata ? JSON.stringify(metadata) : null,
        });

    return userResult[0]?.credits ?? 0;
}

export async function consumeCredit(
    userId: string,
    description: string,
    metadata?: Record<string, unknown>
): Promise<boolean> {
    // Check if user has credits
    const user = await getUserBillingInfo(userId);
    if (!user || user.credits <= 0) {
        return false;
    }

    // Deduct 1 credit
    await (db as any)
        .update(users)
        .set({
            credits: sql`${users.credits} - 1`,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

    // Log transaction
    await (db as any)
        .insert(creditTransactions)
        .values({
            userId,
            type: 'consumption',
            amount: -1,
            description,
            metadata: metadata ? JSON.stringify(metadata) : null,
        });

    return true;
}

// ============================================================================
// Monthly Quota Management
// ============================================================================

export async function incrementMonthlyUploads(userId: string): Promise<number> {
    const result = await (db as any)
        .update(users)
        .set({
            monthlyUploadsUsed: sql`${users.monthlyUploadsUsed} + 1`,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({ monthlyUploadsUsed: users.monthlyUploadsUsed });

    return result[0]?.monthlyUploadsUsed ?? 0;
}

export async function resetMonthlyQuota(userId: string): Promise<void> {
    await (db as any)
        .update(users)
        .set({
            monthlyUploadsUsed: 0,
            monthlyUploadsResetAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

// ============================================================================
// Transaction History
// ============================================================================

export async function getCreditTransactions(
    userId: string,
    limit = 50
): Promise<CreditTransaction[]> {
    const { desc } = await import('drizzle-orm');

    const result = await (db as any)
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(limit);

    return result;
}
