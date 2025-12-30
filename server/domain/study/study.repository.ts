/**
 * Study Repository
 * 
 * Single Responsibility: Database operations for study sessions.
 * Handles card fetching with ownership check, reviews, and FSRS updates.
 */

import { eq } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { cards } from '~/server/db/tables/cards';
import { decks } from '~/server/db/tables/decks';
import { reviews } from '~/server/db/tables/reviews';

export interface CardWithDeck {
    card: {
        id: string;
        deckId: string;
        front: string;
        back: string;
        embedding: number[] | null;
        stability: number | null;
        difficulty: number | null;
        lastReview: Date | null;
        nextReview: Date | null;
    };
    deck: {
        id: string;
        userId: string;
    };
}

export interface FsrsUpdateData {
    stability: number;
    difficulty: number;
    lastReview: Date;
    nextReview: Date;
}

export async function getCardWithOwner(cardId: string): Promise<CardWithDeck | null> {
    const result = await (db as any)
        .select({
            card: cards,
            deck: {
                id: decks.id,
                userId: decks.userId,
            },
        })
        .from(cards)
        .innerJoin(decks, eq(cards.deckId, decks.id))
        .where(eq(cards.id, cardId));

    if (result.length === 0) {
        return null;
    }

    return result[0] as CardWithDeck;
}

export async function updateCardFsrsState(
    cardId: string,
    data: FsrsUpdateData
): Promise<void> {
    await (db as any)
        .update(cards)
        .set({
            stability: data.stability,
            difficulty: data.difficulty,
            lastReview: data.lastReview,
            nextReview: data.nextReview,
        })
        .where(eq(cards.id, cardId));
}

export async function insertReview(
    cardId: string,
    userId: string,
    rating: number
): Promise<void> {
    await (db as any)
        .insert(reviews)
        .values({
            cardId,
            userId,
            rating,
        });
}
