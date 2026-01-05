/**
 * POST /api/decks
 * 
 * Creates a new deck for the authenticated user.
 * Requires authentication.
 * 
 * Body: { topic: string }
 */

import { createUserDeck } from '~/server/domain/decks/deck.service';
import { createDeckSchema, type UserRole } from '~/server/domain/decks/deck.types';
import { findUserById } from '~/server/domain/auth/auth.repository';
import {
    handleException,
    AuthenticationRequiredException,
    ValidationException,
} from '~/server/utils/exceptions';

export default defineEventHandler(async (event) => {
    try {
        const sessionUser = event.context.user;

        if (!sessionUser) {
            throw new AuthenticationRequiredException();
        }

        const body = await readBody(event);
        const parseResult = createDeckSchema.safeParse(body);

        if (!parseResult.success) {
            const errors: Record<string, string[]> = {};
            for (const error of parseResult.error.errors) {
                const field = error.path[0]?.toString() ?? 'unknown';
                if (!errors[field]) {
                    errors[field] = [];
                }
                errors[field].push(error.message);
            }
            throw new ValidationException('Por favor, corrija os erros de validação.', errors);
        }

        const user = await findUserById(sessionUser.sub);

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        const { topic } = parseResult.data;

        const result = await createUserDeck(user.id, topic, user.role as UserRole);

        setResponseStatus(event, 201);
        return {
            success: true,
            message: 'Deck criado com sucesso.',
            data: result,
        };
    } catch (error) {
        return handleException(event, error);
    }
});
