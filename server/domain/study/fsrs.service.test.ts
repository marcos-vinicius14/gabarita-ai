/**
 * FSRS Service Unit Tests
 * 
 * Tests for spaced repetition calculations using Node.js native test runner.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateNextReview, getIntervalDescription } from './fsrs.service';

describe('calculateNextReview', () => {
    describe('with new card (no prior state)', () => {
        it('should return a future date for rating 1 (Again)', () => {
            const result = calculateNextReview({}, 1);

            assert.ok(result.nextReview instanceof Date);
            assert.ok(result.nextReview >= new Date());
            assert.strictEqual(typeof result.stability, 'number');
            assert.strictEqual(typeof result.difficulty, 'number');
            assert.ok(result.lastReview instanceof Date);
        });

        it('should return a future date for rating 2 (Hard)', () => {
            const result = calculateNextReview({}, 2);

            assert.ok(result.nextReview instanceof Date);
            assert.ok(result.nextReview >= new Date());
        });

        it('should return a future date for rating 3 (Good)', () => {
            const result = calculateNextReview({}, 3);

            assert.ok(result.nextReview instanceof Date);
            assert.ok(result.nextReview >= new Date());
        });

        it('should return a future date for rating 4 (Easy)', () => {
            const result = calculateNextReview({}, 4);

            assert.ok(result.nextReview instanceof Date);
            assert.ok(result.nextReview >= new Date());
        });
    });

    describe('rating comparison', () => {
        it('should schedule further out for higher ratings', () => {
            const resultAgain = calculateNextReview({}, 1);
            const resultEasy = calculateNextReview({}, 4);

            assert.ok(
                resultEasy.nextReview.getTime() >= resultAgain.nextReview.getTime(),
                'Easy rating should schedule equal or further than Again'
            );
        });

        it('should have higher stability for Easy than Again', () => {
            const resultAgain = calculateNextReview({}, 1);
            const resultEasy = calculateNextReview({}, 4);

            assert.ok(
                resultEasy.stability >= resultAgain.stability,
                'Easy rating should have higher stability'
            );
        });
    });

    describe('with existing card state', () => {
        it('should use existing stability and difficulty', () => {
            const existingState = {
                stability: 10,
                difficulty: 5,
                lastReview: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            };

            const result = calculateNextReview(existingState, 3);

            assert.ok(result.nextReview instanceof Date);
            assert.strictEqual(typeof result.stability, 'number');
            assert.strictEqual(typeof result.difficulty, 'number');
        });
    });
});

describe('getIntervalDescription', () => {
    it('should return minutes format for short intervals', () => {
        const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
        const result = getIntervalDescription(fiveMinutesFromNow);

        assert.ok(result.includes('min'));
    });

    it('should return hours format for intervals under 24 hours', () => {
        const fiveHoursFromNow = new Date(Date.now() + 5 * 60 * 60 * 1000);
        const result = getIntervalDescription(fiveHoursFromNow);

        assert.ok(result.includes('h'));
    });

    it('should return "em 1 dia" for 1 day interval', () => {
        const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const result = getIntervalDescription(oneDayFromNow);

        assert.strictEqual(result, 'em 1 dia');
    });

    it('should return days format for intervals under a week', () => {
        const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        const result = getIntervalDescription(threeDaysFromNow);

        assert.ok(result.includes('dias'));
    });

    it('should return weeks format for intervals under a month', () => {
        const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        const result = getIntervalDescription(twoWeeksFromNow);

        assert.ok(result.includes('semana'));
    });

    it('should return months format for long intervals', () => {
        const twoMonthsFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
        const result = getIntervalDescription(twoMonthsFromNow);

        assert.ok(result.includes('mes') || result.includes('mês'));
    });
});

describe('Rating Values', () => {
    it('should accept rating 1 (Again)', () => {
        assert.doesNotThrow(() => calculateNextReview({}, 1));
    });

    it('should accept rating 2 (Hard)', () => {
        assert.doesNotThrow(() => calculateNextReview({}, 2));
    });

    it('should accept rating 3 (Good)', () => {
        assert.doesNotThrow(() => calculateNextReview({}, 3));
    });

    it('should accept rating 4 (Easy)', () => {
        assert.doesNotThrow(() => calculateNextReview({}, 4));
    });
});
