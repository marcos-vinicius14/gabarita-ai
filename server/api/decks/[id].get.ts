/**
 * GET /api/decks/:id
 * 
 * Get deck details with all cards.
 * Requires authentication.
 */

import { eq } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { decks } from '~/server/db/tables/decks';
import { cards } from '~/server/db/tables/cards';
import { handleException, AuthenticationRequiredException } from '~/server/utils/exceptions';

export default defineEventHandler(async (event) => {
    try {
        // Check authentication via middleware
        const user = event.context.user;

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        // Get deck ID from route params
        const deckId = getRouterParam(event, 'id');

        if (!deckId) {
            throw new BadRequestException('ID do deck é obrigatório.');
        }

        // Fetch deck
        const deckResult = await (db as any)
            .select()
            .from(decks)
            .where(eq(decks.id, deckId));

        const deck = deckResult[0];

        if (!deck) {
            throw new NotFoundException('Deck não encontrado.');
        }

        // Check ownership
        if (deck.userId !== user.sub) {
            throw new ForbiddenException('Você não tem permissão para acessar este deck.');
        }

        // Fetch cards for this deck
        const deckCards = await (db as any)
            .select({
                id: cards.id,
                deckId: cards.deckId,
                front: cards.front,
                back: cards.back,
                createdAt: cards.createdAt,
            })
            .from(cards)
            .where(eq(cards.deckId, deckId));

        return {
            success: true,
            message: 'Deck carregado com sucesso.',
            data: {
                deck: {
                    id: deck.id,
                    userId: deck.userId,
                    topic: deck.topic,
                    sourceType: deck.sourceType,
                    status: deck.status,
                    r2Key: deck.r2Key,
                    errorMessage: deck.errorMessage,
                    createdAt: deck.createdAt,
                    updatedAt: deck.updatedAt,
                    cardCount: deckCards.length,
                    cards: deckCards,
                },
            },
        };
    } catch (error) {
        return handleException(event, error);
    }
});
