/**
 * Billing Service
 * 
 * Single Responsibility: Business logic for billing operations.
 * Handles upload limits, credit consumption, and usage calculations.
 */

import { countDecksByUser } from '~/server/domain/decks/deck.repository';
import {
    getUserBillingInfo,
    incrementMonthlyUploads,
    consumeCredit as consumeCreditFromRepo,
    addCredits as addCreditsToRepo,
    resetMonthlyQuota,
} from './billing.repository';
import {
    PLAN_LIMITS,
    CREDIT_PACKAGES,
    type UsageStatus,
    type UploadCheckResult,
    type CreditPackageId,
    type UserBillingInfo,
} from './billing.types';
import type { UserRole } from '../auth/auth.types';
import { NotFoundException, ForbiddenException } from '~/server/utils/exceptions';

// ============================================================================
// Plan Limit Helpers
// ============================================================================

function getPlanLimits(role: UserRole): { monthlyUploads: number; maxDecks: number } {
    return PLAN_LIMITS[role] ?? PLAN_LIMITS.free;
}

function isNewMonth(resetDate: Date | null): boolean {
    if (!resetDate) return true;

    const now = new Date();
    const resetMonth = resetDate.getMonth();
    const resetYear = resetDate.getFullYear();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return currentYear > resetYear || (currentYear === resetYear && currentMonth > resetMonth);
}

function getNextMonthFirstDay(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}


/**
 * Check if user can upload a PDF
 * 
 * Logic:
 * 1. Pro/Admin users have unlimited uploads
 * 2. Check if monthly quota needs reset (new month)
 * 3. If monthly quota available, allow (source: monthly_quota)
 * 4. If credits available, allow (source: credits)
 * 5. Otherwise, deny with reason
 */
export async function checkCanUploadPDF(userId: string): Promise<UploadCheckResult> {
    const user = await getUserBillingInfo(userId);

    if (!user) {
        throw new NotFoundException('Usuário não encontrado.');
    }

    const effectiveRole = user.role;
    const limits = getPlanLimits(effectiveRole);

    if (limits.monthlyUploads === Infinity) {
        return {
            allowed: true,
            source: 'unlimited',
            creditsAvailable: user.credits,
            monthlyRemaining: Infinity,
        };
    }

    let currentMonthlyUsed = user.monthlyUploadsUsed;
    if (isNewMonth(user.monthlyUploadsResetAt)) {
        await resetMonthlyQuota(userId);
        currentMonthlyUsed = 0;
    }

    const monthlyRemaining = Math.max(0, limits.monthlyUploads - currentMonthlyUsed);

    if (monthlyRemaining > 0) {
        return {
            allowed: true,
            source: 'monthly_quota',
            creditsAvailable: user.credits,
            monthlyRemaining,
        };
    }

    if (user.credits > 0) {
        return {
            allowed: true,
            source: 'credits',
            creditsAvailable: user.credits,
            monthlyRemaining: 0,
        };
    }

    return {
        allowed: false,
        reason: 'Você atingiu o limite mensal de uploads. Compre créditos para continuar.',
        creditsAvailable: 0,
        monthlyRemaining: 0,
    };
}

/**
 * Consume an upload (either from monthly quota or credits)
 * 
 * @returns The source used ('monthly_quota' or 'credits')
 * @throws ForbiddenException if no quota/credits available
 */
export async function consumeUpload(
    userId: string,
    deckId: string
): Promise<'monthly_quota' | 'credits'> {
    const check = await checkCanUploadPDF(userId);

    if (!check.allowed) {
        throw new ForbiddenException(check.reason ?? 'Upload não permitido.');
    }

    if (check.source === 'unlimited') {
        return 'monthly_quota';
    }

    if (check.source === 'monthly_quota') {
        await incrementMonthlyUploads(userId);
        return 'monthly_quota';
    }

    const consumed = await consumeCreditFromRepo(
        userId,
        'Upload de PDF',
        { deckId }
    );

    if (!consumed) {
        throw new ForbiddenException('Erro ao consumir crédito.');
    }

    return 'credits';
}

/**
 * Add credits from a purchase
 */
export async function purchaseCredits(
    userId: string,
    packageId: CreditPackageId
): Promise<{ credits: number; newBalance: number }> {
    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);

    if (!pkg) {
        throw new NotFoundException('Pacote de créditos não encontrado.');
    }

    const newBalance = await addCreditsToRepo(
        userId,
        pkg.credits,
        'purchase',
        `Compra do pacote ${pkg.label}`,
        { packageId, priceInCents: pkg.priceInCents }
    );

    return { credits: pkg.credits, newBalance };
}

export async function addBonusCredits(
    userId: string,
    amount: number,
    reason: string
): Promise<number> {
    return addCreditsToRepo(userId, amount, 'bonus', reason);
}

export async function getUserUsageStatus(userId: string): Promise<UsageStatus> {
    const user = await getUserBillingInfo(userId);

    if (!user) {
        throw new NotFoundException('Usuário não encontrado.');
    }

    const effectiveRole = user.role;
    const limits = getPlanLimits(effectiveRole);
    const deckCount = await countDecksByUser(userId);

    let currentMonthlyUsed = user.monthlyUploadsUsed;
    if (isNewMonth(user.monthlyUploadsResetAt)) {
        currentMonthlyUsed = 0;
    }

    const monthlyLimit = limits.monthlyUploads === Infinity ? Infinity : limits.monthlyUploads;
    const deckLimit = limits.maxDecks === Infinity ? Infinity : limits.maxDecks;

    const monthlyRemaining = monthlyLimit === Infinity
        ? Infinity
        : Math.max(0, monthlyLimit - currentMonthlyUsed);

    const deckRemaining = deckLimit === Infinity
        ? Infinity
        : Math.max(0, deckLimit - deckCount);

    const canUpload = monthlyRemaining > 0 || user.credits > 0 || monthlyLimit === Infinity;

    return {
        plan: effectiveRole,
        monthlyUploads: {
            used: currentMonthlyUsed,
            limit: monthlyLimit,
            remaining: monthlyRemaining,
        },
        credits: user.credits,
        decks: {
            used: deckCount,
            limit: deckLimit,
            remaining: deckRemaining,
        },
        canUpload,
        nextResetDate: getNextMonthFirstDay(),
        subscription: user.subscriptionStatus ? {
            status: user.subscriptionStatus,
            planId: user.subscriptionPlanId,
            endsAt: user.subscriptionEndsAt?.toISOString() ?? null,
        } : null,
    };
}

// ============================================================================
// Exports for testing
// ============================================================================

export const _testHelpers = {
    isNewMonth,
    getPlanLimits,
    getNextMonthFirstDay,
};
