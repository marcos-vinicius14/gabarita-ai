/**
 * Billing Types
 * 
 * Type definitions for the Billing domain.
 * Includes plan limits, credit packages, and usage tracking types.
 */

import type { UserRole } from '../auth/auth.types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Plan-based upload limits per month
 */
export const PLAN_LIMITS = {
    free: { monthlyUploads: 1, maxDecks: 3 },
    trial: { monthlyUploads: 5, maxDecks: 10 },
    pro: { monthlyUploads: Infinity, maxDecks: Infinity },
    admin: { monthlyUploads: Infinity, maxDecks: Infinity },
} as const;

/**
 * Credit packages available for purchase
 * Price is in centavos (R$ 14,90 = 1490)
 */
export const CREDIT_PACKAGES = [
    { id: 'starter', credits: 5, priceInCents: 1490, label: '5 PDFs' },
    { id: 'standard', credits: 20, priceInCents: 4990, label: '20 PDFs' },
    { id: 'power', credits: 50, priceInCents: 9990, label: '50 PDFs' },
] as const;

export type CreditPackageId = typeof CREDIT_PACKAGES[number]['id'];

/**
 * Subscription plans available
 * Price is in centavos (R$ 29,90 = 2990)
 */
export const SUBSCRIPTION_PLANS = [
    {
        id: 'pro_monthly',
        name: 'Pro Mensal',
        priceInCents: 2990,
        interval: 'month' as const,
        features: ['Uploads ilimitados', 'Decks ilimitados', 'Todos os estilos de banca', 'Suporte prioritário'],
    },
    {
        id: 'pro_annual',
        name: 'Pro Anual',
        priceInCents: 23990,
        interval: 'year' as const,
        features: ['Tudo do Pro Mensal', '2 meses grátis', 'Acesso antecipado a features'],
        savings: '33% de desconto',
    },
] as const;

export type SubscriptionPlanId = typeof SUBSCRIPTION_PLANS[number]['id'];
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | null;

// ============================================================================
// Types
// ============================================================================

export interface UserBillingInfo {
    id: string;
    role: UserRole;
    credits: number;
    monthlyUploadsUsed: number;
    monthlyUploadsResetAt: Date | null;
    trialExpiresAt: Date | null;
    // Subscription fields
    subscriptionStatus: SubscriptionStatus;
    subscriptionPlanId: SubscriptionPlanId | null;
    subscriptionEndsAt: Date | null;
}

export interface UsageStatus {
    plan: UserRole;
    monthlyUploads: {
        used: number;
        limit: number;
        remaining: number;
    };
    credits: number;
    decks: {
        used: number;
        limit: number;
        remaining: number;
    };
    canUpload: boolean;
    nextResetDate: Date | null;
    // Subscription info
    subscription: {
        status: SubscriptionStatus;
        planId: SubscriptionPlanId | null;
        endsAt: string | null;
    } | null;
}

export interface UploadCheckResult {
    allowed: boolean;
    reason?: string;
    source?: 'monthly_quota' | 'credits' | 'unlimited';
    creditsAvailable: number;
    monthlyRemaining: number;
}

export interface CreditTransaction {
    id: string;
    userId: string;
    type: 'purchase' | 'consumption' | 'bonus' | 'refund';
    amount: number;
    description: string | null;
    metadata: string | null;
    createdAt: Date;
}

