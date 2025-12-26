/**
 * Deck Types
 * 
 * Type definitions for the Deck domain.
 */

import { z } from 'zod';
import type { InferSelectModel } from 'drizzle-orm';
import type { decks } from '~/server/db/tables/decks';

// ============================================================================
// Database Types
// ============================================================================

export type Deck = InferSelectModel<typeof decks>;

export interface DeckWithCardCount extends Deck {
    cardCount: number;
}

// ============================================================================
// Input Schemas (Zod Validation)
// ============================================================================

export const createDeckSchema = z.object({
    topic: z
        .string()
        .min(3, 'O tema deve ter pelo menos 3 caracteres.')
        .max(100, 'O tema deve ter no máximo 100 caracteres.')
        .trim(),
});

export type CreateDeckInput = z.infer<typeof createDeckSchema>;

// ============================================================================
// Service Result Types
// ============================================================================

export interface DeckListResult {
    decks: DeckWithCardCount[];
}

export interface CreateDeckResult {
    deck: Deck;
}

// ============================================================================
// Constants
// ============================================================================

export const DECK_LIMITS = {
    free: 3,
    trial: 10,
    pro: 100,
    admin: Infinity,
} as const;

export type UserRole = keyof typeof DECK_LIMITS;
