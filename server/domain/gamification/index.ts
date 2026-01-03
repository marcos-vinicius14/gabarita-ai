/**
 * Gamification Domain - Public API
 */

export {
    updateUserStreak,
    incrementTotalCardsReviewed,
    type StreakUpdateResult,
} from './streak.service';

export {
    getUserGamificationData,
    getReviewActivityForDays,
    type UserGamificationData,
    type DailyActivity,
} from './gamification.repository';
