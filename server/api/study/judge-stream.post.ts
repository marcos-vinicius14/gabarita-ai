/**
 * POST /api/study/judge-stream
 * 
 * Streaming endpoint for explanatory feedback using Server-Sent Events.
 * Used when answers are incorrect to provide detailed, streaming explanation.
 */

import { z } from 'zod';
import { streamText } from 'ai';
import { getGoogleAI } from '~/server/utils/ai';
import { getCardWithOwner } from '~/server/domain/study/study.repository';
import { EXPLANATION_SYSTEM_PROMPT, buildExplanationPrompt } from '~/server/domain/study/prompts';
import {
    AuthenticationRequiredException,
    NotFoundException,
    ForbiddenException,
    ValidationException,
} from '~/server/utils/exceptions';

const streamSchema = z.object({
    cardId: z.string().uuid(),
    userAnswer: z.string().min(1),
});

export default defineEventHandler(async (event) => {
    const user = event.context.user;

    if (!user) {
        throw new AuthenticationRequiredException();
    }

    const body = await readBody(event);
    const validation = streamSchema.safeParse(body);

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

    const google = getGoogleAI();

    const result = streamText({
        model: google('gemini-2.5-flash'),
        system: EXPLANATION_SYSTEM_PROMPT,
        prompt: buildExplanationPrompt(userAnswer, cardWithOwner.card.back),
        temperature: 0.7,
        maxTokens: 1024,
    });

    return result.toTextStreamResponse();
});
