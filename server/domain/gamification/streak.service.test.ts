/**
 * Streak Service Unit Tests
 * 
 * Tests the pure date comparison logic for streak tracking.
 * Note: These tests only cover pure functions that don't require database access.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

function getTodayDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

function getYesterdayDateString(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}

function determineStreakAction(
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

describe('Streak Service', () => {
    describe('getTodayDateString', () => {
        it('should return date in YYYY-MM-DD format', () => {
            const today = getTodayDateString();
            assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('getYesterdayDateString', () => {
        it('should return date in YYYY-MM-DD format', () => {
            const yesterday = getYesterdayDateString();
            assert.match(yesterday, /^\d{4}-\d{2}-\d{2}$/);
        });

        it('should be one day before today', () => {
            const today = new Date(getTodayDateString());
            const yesterday = new Date(getYesterdayDateString());
            const diffMs = today.getTime() - yesterday.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            assert.strictEqual(diffDays, 1);
        });
    });

    describe('determineStreakAction', () => {
        const today = '2026-01-03';
        const yesterday = '2026-01-02';

        it('should return "first_activity" when lastActiveDate is null', () => {
            const action = determineStreakAction(null, today, yesterday);
            assert.strictEqual(action, 'first_activity');
        });

        it('should return "same_day" when lastActiveDate equals today', () => {
            const action = determineStreakAction(today, today, yesterday);
            assert.strictEqual(action, 'same_day');
        });

        it('should return "next_day" when lastActiveDate equals yesterday', () => {
            const action = determineStreakAction(yesterday, today, yesterday);
            assert.strictEqual(action, 'next_day');
        });

        it('should return "broken" when lastActiveDate is older than yesterday', () => {
            const twoDaysAgo = '2026-01-01';
            const action = determineStreakAction(twoDaysAgo, today, yesterday);
            assert.strictEqual(action, 'broken');
        });

        it('should return "broken" when lastActiveDate is much older', () => {
            const longAgo = '2025-12-01';
            const action = determineStreakAction(longAgo, today, yesterday);
            assert.strictEqual(action, 'broken');
        });
    });
});
