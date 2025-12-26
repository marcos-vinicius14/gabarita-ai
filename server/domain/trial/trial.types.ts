/**
 * Trial Types
 * 
 * Type definitions for the Trial domain.
 */

import type { UserRole } from '../auth/auth.types';

// ============================================================================
// Constants
// ============================================================================

export const TRIAL_DURATION_DAYS = 7;

// ============================================================================
// Types
// ============================================================================

export interface TrialStatus {
    isOnTrial: boolean;
    daysRemaining: number | null;
    expiresAt: Date | null;
    effectiveRole: UserRole;
}

export interface TrialUser {
    id: string;
    role: UserRole;
    trialExpiresAt: Date | null;
}
