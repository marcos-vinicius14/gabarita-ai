/**
 * DELETE /api/cards/:id
 * 
 * Delete a card.
 * Requires authentication and deck ownership.
 */

import { eq } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { cards } from '~/server/db/tables/cards';
import { decks } from '~/server/db/tables/decks';
import { handleException, AuthenticationRequiredException } from '~/server/utils/exceptions';

export default defineEventHandler(async (event) => {
    try {
        // Check authentication via middleware
        const user = event.context.user;

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        // Get card ID from route params
        const cardId = getRouterParam(event, 'id');

        if (!cardId) {
            throw new BadRequestException('ID do card é obrigatório.');
        }

        // Fetch the card with its deck
        const cardResult = await (db as any)
            .select({
                card: cards,
                deck: decks,
            })
            .from(cards)
            .innerJoin(decks, eq(cards.deckId, decks.id))
            .where(eq(cards.id, cardId));

        if (cardResult.length === 0) {
            throw new NotFoundException('Card não encontrado.');
        }

        const { deck } = cardResult[0];

        // Check deck ownership
        if (deck.userId !== user.sub) {
            throw new ForbiddenException('Você não tem permissão para excluir este card.');
        }

        // Delete the card
        const deleteResult = await (db as any)
            .delete(cards)
            .where(eq(cards.id, cardId))
            .returning({ id: cards.id });

        if (deleteResult.length === 0) {
            throw new InternalServerException('Falha ao excluir o card.');
        }

        return {
            success: true,
            message: 'Card excluído com sucesso.',
            data: undefined,
        };
    } catch (error) {
        return handleException(event, error);
    }
});
