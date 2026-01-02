/**
 * Subscription Service
 * 
 * Single Responsibility: Business logic for subscription management.
 * Handles subscription activation, status checks, and role mapping.
 */

import { eq } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { users } from '~/server/domain/auth/schema/users';
import {
    SUBSCRIPTION_PLANS,
    type SubscriptionPlanId,
    type SubscriptionStatus,
} from './billing.types';
import { NotFoundException, BadRequestException } from '~/server/utils/exceptions';

// ============================================================================
// Subscription Status Checks
// ============================================================================

export function isSubscriptionActive(
    status: SubscriptionStatus,
    endsAt: Date | null
): boolean {
    if (!status) return false;
    if (status === 'canceled' && endsAt && endsAt > new Date()) {
        // Canceled but still within paid period
        return true;
    }
    return status === 'active' || status === 'trialing';
}

export function getSubscriptionPlan(planId: SubscriptionPlanId | null) {
    if (!planId) return null;
    return SUBSCRIPTION_PLANS.find(p => p.id === planId) ?? null;
}

// ============================================================================
// Subscription Repository Operations
// ============================================================================

export async function activateSubscription(
    userId: string,
    planId: SubscriptionPlanId,
    stripeCustomerId: string,
    endsAt: Date
): Promise<void> {
    await (db as any)
        .update(users)
        .set({
            role: 'pro',
            stripeCustomerId,
            subscriptionStatus: 'active',
            subscriptionPlanId: planId,
            subscriptionEndsAt: endsAt,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

export async function cancelSubscription(
    userId: string,
    endsAt: Date
): Promise<void> {
    await (db as any)
        .update(users)
        .set({
            subscriptionStatus: 'canceled',
            subscriptionEndsAt: endsAt,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

export async function expireSubscription(userId: string): Promise<void> {
    await (db as any)
        .update(users)
        .set({
            role: 'free',
            subscriptionStatus: null,
            subscriptionPlanId: null,
            subscriptionEndsAt: null,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

export async function updateSubscriptionStatus(
    userId: string,
    status: SubscriptionStatus
): Promise<void> {
    await (db as any)
        .update(users)
        .set({
            subscriptionStatus: status,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

// ============================================================================
// Mock Subscription (for development)
// ============================================================================

/**
 * Mock subscription activation for development
 * In production, this would be triggered by Stripe webhook
 */
export async function mockActivateSubscription(
    userId: string,
    planId: SubscriptionPlanId
): Promise<{ endsAt: Date; planName: string }> {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);

    if (!plan) {
        throw new NotFoundException('Plano não encontrado.');
    }

    const now = new Date();
    let endsAt: Date;

    if (plan.interval === 'month') {
        endsAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    } else {
        endsAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    }

    // Mock Stripe customer ID
    const mockStripeCustomerId = `cus_mock_${userId.substring(0, 8)}`;

    await activateSubscription(userId, planId, mockStripeCustomerId, endsAt);

    return { endsAt, planName: plan.name };
}

/**
 * Mock subscription cancellation for development
 */
export async function mockCancelSubscription(userId: string): Promise<void> {
    // Get current subscription end date or use 30 days from now
    const result = await (db as any)
        .select({ subscriptionEndsAt: users.subscriptionEndsAt })
        .from(users)
        .where(eq(users.id, userId));

    const currentEndsAt = result[0]?.subscriptionEndsAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await cancelSubscription(userId, currentEndsAt);
}
