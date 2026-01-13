/**
 * Study API Types (Discriminated Unions)
 * 
 * Type-safe API responses for study operations.
 */

import type { ApiResponse } from './decks';

export interface JudgeInput {
    cardId: string;
    userAnswer: string;
}

export interface JudgeResult {
    isCorrect: boolean;
    feedback: string;
    suggestedRating?: 1 | 2 | 3 | 4;
    similarity?: number;
}

export type JudgeResponse = ApiResponse<JudgeResult>;

export type Rating = 1 | 2 | 3 | 4;

export const RATING_LABELS: Record<Rating, string> = {
    1: 'Errei',
    2: 'Difícil',
    3: 'Bom',
    4: 'Fácil',
} as const;

export interface LogInput {
    cardId: string;
    rating: Rating;
}

export interface LogResult {
    nextReview: string;
}

export type LogResponse = ApiResponse<LogResult>;
