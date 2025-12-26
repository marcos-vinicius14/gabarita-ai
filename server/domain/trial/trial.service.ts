/**
 * Trial Service
 * 
 * Single Responsibility: Business logic for trial period management.
 * Handles trial activation, expiry checks, and role calculations.
 */

import { updateUserRoleAndTrial, downgradeToFree } from './trial.repository';
import { TRIAL_DURATION_DAYS, type TrialStatus, type TrialUser } from './trial.types';
import type { UserRole } from '~/server/domain/auth/auth.types';
import { ForbiddenException, BadRequestException } from '~/server/utils/exceptions';




export function calculateTrialExpiryDate(): Date {
    const now = new Date();
    return new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
}

export function isTrialExpired(user: TrialUser): boolean {
    if (user.role !== 'trial') {
        return false;
    }

    if (!user.trialExpiresAt) {
        return true;
    }

    return user.trialExpiresAt < new Date();
}

export function getEffectiveRole(user: TrialUser): UserRole {
    if (user.role === 'trial' && isTrialExpired(user)) {
        return 'free';
    }
    return user.role;
}

export function getTrialDaysRemaining(user: TrialUser): number | null {
    if (user.role !== 'trial') {
        return null;
    }

    if (!user.trialExpiresAt) {
        return 0;
    }

    const now = new Date();
    const diff = user.trialExpiresAt.getTime() - now.getTime();

    if (diff <= 0) {
        return 0;
    }

    return Math.ceil(diff / (24 * 60 * 60 * 1000));
}


export function getTrialStatus(user: TrialUser): TrialStatus {
    return {
        isOnTrial: user.role === 'trial' && !isTrialExpired(user),
        daysRemaining: getTrialDaysRemaining(user),
        expiresAt: user.trialExpiresAt,
        effectiveRole: getEffectiveRole(user),
    };
}



/**
 * Starts a 7-day trial for a user
 * 
 * @param userId - The user's ID
 * @param currentRole - The user's current role
 * @throws BadRequestException if user is not on 'free' plan
 * @throws ForbiddenException if user already used trial
 */
export async function startTrial(
    userId: string,
    currentRole: UserRole,
    currentTrialExpiresAt: Date | null
): Promise<Date> {
    if (currentRole !== 'free') {
        throw new BadRequestException(
            'Apenas usuários do plano gratuito podem iniciar um período de teste.',
            { code: 'NOT_FREE_USER' }
        );
    }

    if (currentTrialExpiresAt !== null) {
        throw new ForbiddenException(
            'Você já utilizou seu período de teste gratuito.',
            { code: 'TRIAL_ALREADY_USED' }
        );
    }

    const expiresAt = calculateTrialExpiryDate();

    await updateUserRoleAndTrial(userId, 'trial', expiresAt);

    return expiresAt;
}


export async function checkAndDowngradeTrial(user: TrialUser): Promise<boolean> {
    if (!isTrialExpired(user)) {
        return false;
    }

    await downgradeToFree(user.id);
    return true;
}
