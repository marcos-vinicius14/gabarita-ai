/**
 * Deck Service
 * 
 * Single Responsibility: Business logic for deck management.
 * Orchestrates deck operations with validation and authorization.
 */

import {
    getDecksByUser,
    getDeckById,
    countDecksByUser,
    createDeck as createDeckInDb,
    deleteDeck as deleteDeckInDb,
} from './deck.repository';
import {
    type DeckListResult,
    type CreateDeckResult,
    type UserRole,
    DECK_LIMITS,
} from './deck.types';
import {
    ForbiddenException,
    NotFoundException,
} from '~/server/utils/exceptions';


/**
 * Lists all decks for a user
 * 
 * @param userId - The user's ID
 * @returns List of decks with card counts
 */
export async function listUserDecks(userId: string): Promise<DeckListResult> {
    const decks = await getDecksByUser(userId);
    return { decks };
}

/**
 * Creates a new deck for a user
 * 
 * @param userId - The user's ID
 * @param topic - The deck topic
 * @param userRole - The user's role (for limit enforcement)
 * @returns The created deck
 * @throws ForbiddenException if user has reached deck limit
 */
export async function createUserDeck(
    userId: string,
    topic: string,
    userRole: UserRole = 'free'
): Promise<CreateDeckResult> {
    const currentCount = await countDecksByUser(userId);
    const limit = DECK_LIMITS[userRole];

    if (currentCount >= limit) {
        throw new ForbiddenException(
            `Você atingiu o limite de ${limit} decks para sua conta. Faça upgrade para criar mais.`,
            { code: 'DECK_LIMIT_EXCEEDED' }
        );
    }

    const deck = await createDeckInDb(userId, topic);

    return { deck };
}

/**
 * Deletes a deck
 * 
 * @param deckId - The deck's ID
 * @param userId - The user's ID (for ownership verification)
 * @throws NotFoundException if deck doesn't exist
 * @throws ForbiddenException if user doesn't own the deck
 */
export async function deleteUserDeck(
    deckId: string,
    userId: string
): Promise<void> {
    const deck = await getDeckById(deckId);

    if (!deck) {
        throw new NotFoundException('Deck não encontrado.', { code: 'DECK_NOT_FOUND' });
    }

    if (deck.userId !== userId) {
        throw new ForbiddenException(
            'Você não tem permissão para excluir este deck.',
            { code: 'DECK_ACCESS_DENIED' }
        );
    }

    await deleteDeckInDb(deckId);
}
