/**
 * Deck Repository
 * 
 * Single Responsibility: Database operations for decks.
 * Handles CRUD operations for the decks table.
 */

import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { decks } from '~/server/db/tables/decks';
import { cards } from '~/server/db/tables/cards';
import { getOrSet, del as delCache } from '~/server/utils/cache.service';
import type { Deck, DeckWithCardCount, DeckStatus } from './deck.types';


export async function getDecksByUser(userId: string): Promise<DeckWithCardCount[]> {
    const result = await (db as any)
        .select({
            id: decks.id,
            userId: decks.userId,
            topic: decks.topic,
            sourceType: decks.sourceType,
            status: decks.status,
            r2Key: decks.r2Key,
            errorMessage: decks.errorMessage,
            createdAt: decks.createdAt,
            updatedAt: decks.updatedAt,
            cardCount: sql<number>`count(${cards.id})::int`,
        })
        .from(decks)
        .leftJoin(cards, eq(cards.deckId, decks.id))
        .where(eq(decks.userId, userId))
        .groupBy(decks.id)
        .orderBy(desc(decks.updatedAt));

    return result as DeckWithCardCount[];
}

export async function getDeckById(deckId: string): Promise<Deck | undefined> {
    return getOrSet(`deck:${deckId}`, async () => {
        const result = await (db as any)
            .select()
            .from(decks)
            .where(eq(decks.id, deckId));

        return result[0] as Deck | undefined;
    });
}

export async function countDecksByUser(userId: string): Promise<number> {
    const result = await (db as any)
        .select({ count: sql<number>`count(*)::int` })
        .from(decks)
        .where(eq(decks.userId, userId));

    return result[0]?.count ?? 0;
}

export async function createDeck(userId: string, topic: string): Promise<Deck> {
    const result = await (db as any)
        .insert(decks)
        .values({
            userId,
            topic,
            sourceType: 'topic',
            status: 'ready',
        })
        .returning();

    return result[0] as Deck;
}


export async function createDeckFromUpload(
    userId: string,
    filename: string,
    r2Key: string
): Promise<Deck> {
    const result = await (db as any)
        .insert(decks)
        .values({
            userId,
            topic: filename.replace(/\.pdf$/i, ''),
            sourceType: 'pdf_upload',
            status: 'processing',
            r2Key,
        })
        .returning();

    return result[0] as Deck;
}

export async function updateDeckStatus(
    deckId: string,
    status: DeckStatus,
    errorMessage?: string
): Promise<Deck | undefined> {
    // Invalidate cache
    await delCache(`deck:${deckId}`);

    const result = await (db as any)
        .update(decks)
        .set({
            status,
            errorMessage: errorMessage ?? null,
            updatedAt: new Date(),
        })
        .where(eq(decks.id, deckId))
        .returning();

    return result[0] as Deck | undefined;
}

/**
 * Get a deck by its R2 key
 */
export async function getDeckByR2Key(r2Key: string): Promise<Deck | undefined> {
    const result = await (db as any)
        .select()
        .from(decks)
        .where(eq(decks.r2Key, r2Key));

    return result[0] as Deck | undefined;
}

export async function deleteDeck(deckId: string): Promise<boolean> {
    // Invalidate cache
    await delCache(`deck:${deckId}`);

    const result = await (db as any)
        .delete(decks)
        .where(eq(decks.id, deckId))
        .returning({ id: decks.id });

    return result.length > 0;
}

// =============================================================================
// Card Query Functions (for Study Flow)
// =============================================================================

export interface DueCard {
    id: string;
    deckId: string;
    front: string;
    back: string;
    nextReview: Date | null;
    createdAt: Date;
}

export async function getDueCardsByDeck(deckId: string): Promise<DueCard[]> {
    const { or, lte, isNull, asc, and } = await import('drizzle-orm');
    const now = new Date();

    const result = await (db as any)
        .select({
            id: cards.id,
            deckId: cards.deckId,
            front: cards.front,
            back: cards.back,
            nextReview: cards.nextReview,
            createdAt: cards.createdAt,
        })
        .from(cards)
        .where(
            and(
                eq(cards.deckId, deckId),
                or(
                    lte(cards.nextReview, now),
                    isNull(cards.nextReview)
                )
            )
        )
        .orderBy(asc(cards.nextReview));

    return result as DueCard[];
}

export async function getNextReviewDateByDeck(deckId: string): Promise<Date | null> {
    const { asc } = await import('drizzle-orm');

    const result = await (db as any)
        .select({
            nextReview: cards.nextReview,
        })
        .from(cards)
        .where(eq(cards.deckId, deckId))
        .orderBy(asc(cards.nextReview))
        .limit(1);

    if (result.length > 0 && result[0].nextReview) {
        return result[0].nextReview;
    }
    return null;
}

export async function countCardsByDeck(deckId: string): Promise<number> {
    const result = await (db as any)
        .select({ count: sql<number>`count(*)::int` })
        .from(cards)
        .where(eq(cards.deckId, deckId));

    return result[0]?.count ?? 0;
}
