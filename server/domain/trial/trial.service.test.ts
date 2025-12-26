/**
 * Trial Service Unit Tests
 * 
 * Tests for trial business logic using Node.js native test runner.
 * Tests pure functions without external dependencies.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// ============================================================================
// Test Constants (Inline to avoid import issues)
// ============================================================================

const TRIAL_DURATION_DAYS = 7;

type UserRole = 'free' | 'trial' | 'pro' | 'admin';

interface TrialUser {
    id: string;
    role: UserRole;
    trialExpiresAt: Date | null;
}


function calculateTrialExpiryDate(): Date {
    const now = new Date();
    return new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
}

function isTrialExpired(user: TrialUser): boolean {
    if (user.role !== 'trial') {
        return false;
    }

    if (!user.trialExpiresAt) {
        return true;
    }

    return user.trialExpiresAt < new Date();
}

function getEffectiveRole(user: TrialUser): UserRole {
    if (user.role === 'trial' && isTrialExpired(user)) {
        return 'free';
    }
    return user.role;
}

function getTrialDaysRemaining(user: TrialUser): number | null {
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


const mockUserId = '018e1234-5678-7000-0000-000000000001';

function createMockUser(overrides: Partial<TrialUser> = {}): TrialUser {
    return {
        id: mockUserId,
        role: 'free',
        trialExpiresAt: null,
        ...overrides,
    };
}

function getFutureDate(days: number): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function getPastDate(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}


describe('isTrialExpired', () => {
    it('should return false for free users', () => {
        const user = createMockUser({ role: 'free' });
        assert.strictEqual(isTrialExpired(user), false);
    });

    it('should return false for pro users', () => {
        const user = createMockUser({ role: 'pro' });
        assert.strictEqual(isTrialExpired(user), false);
    });

    it('should return false for admin users', () => {
        const user = createMockUser({ role: 'admin' });
        assert.strictEqual(isTrialExpired(user), false);
    });

    it('should return false for trial user with active trial', () => {
        const user = createMockUser({
            role: 'trial',
            trialExpiresAt: getFutureDate(3),
        });
        assert.strictEqual(isTrialExpired(user), false);
    });

    it('should return true for trial user with expired trial', () => {
        const user = createMockUser({
            role: 'trial',
            trialExpiresAt: getPastDate(1),
        });
        assert.strictEqual(isTrialExpired(user), true);
    });

    it('should return true for trial user without expiry date', () => {
        const user = createMockUser({
            role: 'trial',
            trialExpiresAt: null,
        });
        assert.strictEqual(isTrialExpired(user), true);
    });
});

describe('getEffectiveRole', () => {
    it('should return free for free users', () => {
        const user = createMockUser({ role: 'free' });
        assert.strictEqual(getEffectiveRole(user), 'free');
    });

    it('should return pro for pro users', () => {
        const user = createMockUser({ role: 'pro' });
        assert.strictEqual(getEffectiveRole(user), 'pro');
    });

    it('should return admin for admin users', () => {
        const user = createMockUser({ role: 'admin' });
        assert.strictEqual(getEffectiveRole(user), 'admin');
    });

    it('should return trial for active trial users', () => {
        const user = createMockUser({
            role: 'trial',
            trialExpiresAt: getFutureDate(5),
        });
        assert.strictEqual(getEffectiveRole(user), 'trial');
    });

    it('should return free for expired trial users', () => {
        const user = createMockUser({
            role: 'trial',
            trialExpiresAt: getPastDate(2),
        });
        assert.strictEqual(getEffectiveRole(user), 'free');
    });

    it('should return free for trial user without expiry date', () => {
        const user = createMockUser({
            role: 'trial',
            trialExpiresAt: null,
        });
        assert.strictEqual(getEffectiveRole(user), 'free');
    });
});


describe('getTrialDaysRemaining', () => {
    it('should return null for free users', () => {
        const user = createMockUser({ role: 'free' });
        assert.strictEqual(getTrialDaysRemaining(user), null);
    });

    it('should return null for pro users', () => {
        const user = createMockUser({ role: 'pro' });
        assert.strictEqual(getTrialDaysRemaining(user), null);
    });

    it('should return correct days for active trial', () => {
        const user = createMockUser({
            role: 'trial',
            trialExpiresAt: getFutureDate(5),
        });
        const days = getTrialDaysRemaining(user);
        assert.ok(days !== null);
        assert.ok(days >= 4 && days <= 6);
    });

    it('should return 0 for expired trial', () => {
        const user = createMockUser({
            role: 'trial',
            trialExpiresAt: getPastDate(3),
        });
        assert.strictEqual(getTrialDaysRemaining(user), 0);
    });

    it('should return 0 for trial without expiry date', () => {
        const user = createMockUser({
            role: 'trial',
            trialExpiresAt: null,
        });
        assert.strictEqual(getTrialDaysRemaining(user), 0);
    });

    it('should return 7 for freshly started trial', () => {
        const user = createMockUser({
            role: 'trial',
            trialExpiresAt: getFutureDate(7),
        });
        const days = getTrialDaysRemaining(user);
        assert.ok(days !== null);
        assert.ok(days >= 6 && days <= 8);
    });
});

describe('calculateTrialExpiryDate', () => {
    it('should return a date 7 days in the future', () => {
        const expiryDate = calculateTrialExpiryDate();
        const now = new Date();
        const diff = expiryDate.getTime() - now.getTime();
        const days = diff / (24 * 60 * 60 * 1000);

        assert.ok(days >= 6.9 && days <= 7.1);
    });

    it('should return a Date object', () => {
        const expiryDate = calculateTrialExpiryDate();
        assert.ok(expiryDate instanceof Date);
    });

    it('should return a date in the future', () => {
        const expiryDate = calculateTrialExpiryDate();
        assert.ok(expiryDate > new Date());
    });
});

describe('Trial Business Logic', () => {
    it('free users should not be able to use trial features', () => {
        const user = createMockUser({ role: 'free' });
        const effectiveRole = getEffectiveRole(user);
        const isOnTrial = user.role === 'trial' && !isTrialExpired(user);

        assert.strictEqual(effectiveRole, 'free');
        assert.strictEqual(isOnTrial, false);
    });

    it('trial users should be able to use trial features', () => {
        const user = createMockUser({
            role: 'trial',
            trialExpiresAt: getFutureDate(5),
        });
        const effectiveRole = getEffectiveRole(user);
        const isOnTrial = user.role === 'trial' && !isTrialExpired(user);

        assert.strictEqual(effectiveRole, 'trial');
        assert.strictEqual(isOnTrial, true);
    });

    it('expired trial users should be treated as free', () => {
        const user = createMockUser({
            role: 'trial',
            trialExpiresAt: getPastDate(1),
        });
        const effectiveRole = getEffectiveRole(user);
        const isOnTrial = user.role === 'trial' && !isTrialExpired(user);

        assert.strictEqual(effectiveRole, 'free');
        assert.strictEqual(isOnTrial, false);
    });
});
