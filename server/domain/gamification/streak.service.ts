/**
 * Streak Service
 * 
 * Single Responsibility: Business logic for streak tracking.
 * Handles date comparisons and streak calculations.
 */

import {
    getUserGamificationData,
    updateUserStreakData,
    incrementTotalCardsReviewed as repoIncrementTotalCards,
} from './gamification.repository';

// ============================================================================
// Types
// ============================================================================

export interface StreakUpdateResult {
    newStreak: number;
    streakBroken: boolean;
    isFirstActivity: boolean;
}

// ============================================================================
// Date Helpers
// ============================================================================

/**
 * Gets today's date as YYYY-MM-DD string (UTC)
 */
export function getTodayDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

/**
 * Gets yesterday's date as YYYY-MM-DD string (UTC)
 */
export function getYesterdayDateString(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}

/**
 * Determines the streak action based on last active date
 */
export function determineStreakAction(
    lastActiveDate: string | null,
    today: string,
    yesterday: string
): 'same_day' | 'next_day' | 'broken' | 'first_activity' {
    if (!lastActiveDate) {
        return 'first_activity';
    }

    if (lastActiveDate === today) {
        return 'same_day';
    }

    if (lastActiveDate === yesterday) {
        return 'next_day';
    }

    return 'broken';
}

// ============================================================================
// Streak Service
// ============================================================================

/**
 * Updates user's streak based on current activity.
 * 
 * Logic:
 * - Same day: No change
 * - Yesterday: Increment streak
 * - Older than yesterday: Reset streak to 1 (broken)
 * - First activity: Start streak at 1
 */
export async function updateUserStreak(userId: string): Promise<StreakUpdateResult> {
    const userData = await getUserGamificationData(userId);

    if (!userData) {
        throw new Error(`User not found: ${userId}`);
    }

    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();
    const action = determineStreakAction(userData.lastActiveDate, today, yesterday);

    let newStreak: number;
    let streakBroken = false;
    let isFirstActivity = false;

    switch (action) {
        case 'same_day':
            // No streak update needed
            return {
                newStreak: userData.streakDays,
                streakBroken: false,
                isFirstActivity: false,
            };

        case 'next_day':
            // Continue streak
            newStreak = userData.streakDays + 1;
            break;

        case 'broken':
            // Reset streak
            newStreak = 1;
            streakBroken = userData.streakDays > 0;
            break;

        case 'first_activity':
            // Start streak
            newStreak = 1;
            isFirstActivity = true;
            break;
    }

    await updateUserStreakData(userId, newStreak, today);

    return {
        newStreak,
        streakBroken,
        isFirstActivity,
    };
}

/**
 * Increments total cards reviewed for a user
 */
export async function incrementTotalCardsReviewed(userId: string): Promise<void> {
    await repoIncrementTotalCards(userId);
}
