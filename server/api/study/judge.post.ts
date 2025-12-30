/**
 * POST /api/study/judge - Evaluates user answer in Hardcore Mode
 */

import { z } from 'zod';
import { getCardWithOwner } from '~/server/domain/study/study.repository';
import { evaluateAnswer } from '~/server/domain/study/judge.service';
import {
    handleException,
    AuthenticationRequiredException,
    NotFoundException,
    ForbiddenException,
    ValidationException,
} from '~/server/utils/exceptions';

const judgeSchema = z.object({
    cardId: z.string().uuid(),
    userAnswer: z.string().min(1, 'Resposta é obrigatória.'),
});

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user;

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        const body = await readBody(event);
        const validation = judgeSchema.safeParse(body);

        if (!validation.success) {
            throw new ValidationException(
                'Dados inválidos.',
                validation.error.flatten().fieldErrors
            );
        }

        const { cardId, userAnswer } = validation.data;

        const cardWithOwner = await getCardWithOwner(cardId);

        if (!cardWithOwner) {
            throw new NotFoundException('Card não encontrado.');
        }

        if (cardWithOwner.deck.userId !== user.sub) {
            throw new ForbiddenException('Você não tem permissão para acessar este card.');
        }

        const result = await evaluateAnswer(
            userAnswer,
            cardWithOwner.card.back,
            cardWithOwner.card.embedding
        );

        return {
            success: true,
            message: result.isCorrect ? 'Resposta avaliada como correta.' : 'Resposta avaliada como incorreta.',
            data: result,
        };
    } catch (error) {
        return handleException(event, error);
    }
});
