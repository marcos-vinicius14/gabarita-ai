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
import type { Deck, DeckWithCardCount } from './deck.types';


export async function getDecksByUser(userId: string): Promise<DeckWithCardCount[]> {
    const result = await (db as any)
        .select({
            id: decks.id,
            userId: decks.userId,
            topic: decks.topic,
            sourceType: decks.sourceType,
            status: decks.status,
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
    const result = await (db as any)
        .select()
        .from(decks)
        .where(eq(decks.id, deckId));

    return result[0] as Deck | undefined;
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

export async function deleteDeck(deckId: string): Promise<boolean> {
    const result = await (db as any)
        .delete(decks)
        .where(eq(decks.id, deckId))
        .returning({ id: decks.id });

    return result.length > 0;
}
