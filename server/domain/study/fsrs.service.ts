/**
 * FSRS Service
 * 
 * Single Responsibility: Spaced Repetition scheduling using ts-fsrs.
 * Pure functions for calculating next review dates and memory states.
 */

import { createEmptyCard, FSRS, generatorParameters, Rating as FsrsRating } from 'ts-fsrs';


export interface FsrsResult {
    nextReview: Date;
    stability: number;
    difficulty: number;
    lastReview: Date;
}

export interface CardState {
    stability?: number | null;
    difficulty?: number | null;
    lastReview?: Date | null;
}

const fsrsParams = generatorParameters();
const fsrs = new FSRS(fsrsParams);

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Calculates the next review date and memory state using FSRS algorithm.
 * 
 * @param card - Current card state (stability, difficulty, lastReview)
 * @param rating - User rating (1=Again, 2=Hard, 3=Good, 4=Easy)
 * @returns New FSRS state with nextReview, stability, difficulty
 */
export function calculateNextReview(
    card: CardState,
    rating: 1 | 2 | 3 | 4
): FsrsResult {
    const now = new Date();

    const fsrsCard = createEmptyCard(now);

    if (card.stability && card.difficulty && card.lastReview) {
        fsrsCard.stability = card.stability;
        fsrsCard.difficulty = card.difficulty;
        fsrsCard.last_review = card.lastReview;
        fsrsCard.state = 2;
    }

    const schedulingCards = fsrs.repeat(fsrsCard, now);
    const ratingEnumMap: Record<1 | 2 | 3 | 4, FsrsRating> = {
        1: FsrsRating.Again,
        2: FsrsRating.Hard,
        3: FsrsRating.Good,
        4: FsrsRating.Easy,
    };

    const fsrsRatingKey = ratingEnumMap[rating];
    const result = schedulingCards[fsrsRatingKey];

    return {
        nextReview: result.card.due,
        stability: result.card.stability,
        difficulty: result.card.difficulty,
        lastReview: now,
    };
}

/**
 * Gets human-readable interval description
 * 
 * @param nextReview - The next review date
 * @returns Human-readable string like "em 1 dia", "em 2 semanas"
 */
export function getIntervalDescription(nextReview: Date): string {
    const now = new Date();
    const diffMs = nextReview.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
        return `em ${diffMinutes} min`;
    }
    if (diffHours < 24) {
        return `em ${diffHours}h`;
    }
    if (diffDays === 1) {
        return 'em 1 dia';
    }
    if (diffDays < 7) {
        return `em ${diffDays} dias`;
    }
    if (diffDays < 30) {
        const weeks = Math.round(diffDays / 7);
        return `em ${weeks} semana${weeks > 1 ? 's' : ''}`;
    }
    const months = Math.round(diffDays / 30);
    return `em ${months} ${months === 1 ? 'mês' : 'meses'}`;
}
