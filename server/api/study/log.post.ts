/**
 * POST /api/study/log - Logs a card review with FSRS rating
 */

import { z } from 'zod';
import {
    getCardWithOwner,
    updateCardFsrsState,
    insertReview,
} from '~/server/domain/study/study.repository';
import { calculateNextReview } from '~/server/domain/study/fsrs.service';
import {
    handleException,
    AuthenticationRequiredException,
    NotFoundException,
    ForbiddenException,
    ValidationException,
} from '~/server/utils/exceptions';

const logSchema = z.object({
    cardId: z.string().uuid(),
    rating: z.number().int().min(1).max(4) as z.ZodType<1 | 2 | 3 | 4>,
});

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user;

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        const body = await readBody(event);
        const validation = logSchema.safeParse(body);

        if (!validation.success) {
            throw new ValidationException(
                'Dados inválidos.',
                validation.error.flatten().fieldErrors
            );
        }

        const { cardId, rating } = validation.data;

        const cardWithOwner = await getCardWithOwner(cardId);

        if (!cardWithOwner) {
            throw new NotFoundException('Card não encontrado.');
        }

        if (cardWithOwner.deck.userId !== user.sub) {
            throw new ForbiddenException('Você não tem permissão para acessar este card.');
        }

        const fsrsResult = calculateNextReview(
            {
                stability: cardWithOwner.card.stability,
                difficulty: cardWithOwner.card.difficulty,
                lastReview: cardWithOwner.card.lastReview,
            },
            rating
        );

        await updateCardFsrsState(cardId, {
            stability: Math.round(fsrsResult.stability),
            difficulty: Math.round(fsrsResult.difficulty),
            lastReview: fsrsResult.lastReview,
            nextReview: fsrsResult.nextReview,
        });

        await insertReview(cardId, user.sub, rating);

        return {
            success: true,
            message: 'Review registrado com sucesso.',
            data: {
                nextReview: fsrsResult.nextReview.toISOString(),
            },
        };
    } catch (error) {
        return handleException(event, error);
    }
});
