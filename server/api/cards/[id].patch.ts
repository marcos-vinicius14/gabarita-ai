/**
 * PATCH /api/cards/:id
 * 
 * Update a card's front or back content.
 * Requires authentication and deck ownership.
 */

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~/server/utils/db';
import { cards } from '~/server/db/tables/cards';
import { decks } from '~/server/db/tables/decks';
import { handleException, AuthenticationRequiredException } from '~/server/utils/exceptions';

const updateCardSchema = z.object({
    front: z.string().min(1).max(5000).optional(),
    back: z.string().min(1).max(5000).optional(),
}).refine(data => data.front !== undefined || data.back !== undefined, {
    message: 'Pelo menos um campo (front ou back) deve ser fornecido.',
});

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

        // Parse and validate body
        const body = await readBody(event);
        const validation = updateCardSchema.safeParse(body);

        if (!validation.success) {
            throw new ValidationException(
                'Dados inválidos.',
                validation.error.flatten().fieldErrors
            );
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

        const { card, deck } = cardResult[0];

        // Check deck ownership
        if (deck.userId !== user.sub) {
            throw new ForbiddenException('Você não tem permissão para editar este card.');
        }

        // Build update object
        const updates: { front?: string; back?: string } = {};
        if (validation.data.front !== undefined) {
            updates.front = validation.data.front.trim();
        }
        if (validation.data.back !== undefined) {
            updates.back = validation.data.back.trim();
        }

        // Update the card
        const updatedResult = await (db as any)
            .update(cards)
            .set(updates)
            .where(eq(cards.id, cardId))
            .returning();

        const updatedCard = updatedResult[0];

        return {
            success: true,
            message: 'Card atualizado com sucesso.',
            data: {
                card: {
                    id: updatedCard.id,
                    deckId: updatedCard.deckId,
                    front: updatedCard.front,
                    back: updatedCard.back,
                    createdAt: updatedCard.createdAt,
                },
            },
        };
    } catch (error) {
        return handleException(event, error);
    }
});
