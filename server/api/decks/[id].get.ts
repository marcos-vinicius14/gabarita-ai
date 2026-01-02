/**
 * GET /api/decks/:id
 * 
 * Get deck details with cards due for review.
 * Only returns cards where next_review <= NOW() or next_review is null (new cards).
 * Requires authentication.
 */

import {
    getDeckById,
    getDueCardsByDeck,
    getNextReviewDateByDeck,
    countCardsByDeck,
} from '~/server/domain/decks/deck.repository';
import {
    handleException,
    AuthenticationRequiredException,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '~/server/utils/exceptions';

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user;

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        const deckId = getRouterParam(event, 'id');

        if (!deckId) {
            throw new BadRequestException('ID do deck é obrigatório.');
        }

        const deck = await getDeckById(deckId);

        if (!deck) {
            throw new NotFoundException('Deck não encontrado.');
        }

        if (deck.userId !== user.sub) {
            throw new ForbiddenException('Você não tem permissão para acessar este deck.');
        }

        const dueCards = await getDueCardsByDeck(deckId);
        const cardCount = await countCardsByDeck(deckId);

        let nextReviewDate: string | null = null;
        if (dueCards.length === 0) {
            const nextDate = await getNextReviewDateByDeck(deckId);
            if (nextDate) {
                nextReviewDate = nextDate.toISOString();
            }
        }

        return {
            success: true,
            message: dueCards.length > 0
                ? 'Deck carregado com sucesso.'
                : 'Não há cards para revisar no momento.',
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
                    cardCount,
                    dueCardCount: dueCards.length,
                    cards: dueCards,
                    nextReviewDate,
                },
            },
        };
    } catch (error) {
        return handleException(event, error);
    }
});
