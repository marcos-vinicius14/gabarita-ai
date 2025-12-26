/**
 * GET /api/decks
 * 
 * Returns all decks for the authenticated user.
 * Requires authentication.
 */

import { listUserDecks } from '~/server/domain/decks/deck.service';
import { handleException, AuthenticationRequiredException } from '~/server/utils/exceptions';

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user;

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        const result = await listUserDecks(user.sub);

        return {
            success: true,
            message: 'Decks carregados com sucesso.',
            data: result,
        };
    } catch (error) {
        return handleException(event, error);
    }
});
