/**
 * DELETE /api/decks/:id
 * 
 * Deletes a deck owned by the authenticated user.
 * Requires authentication and ownership.
 */

import { deleteUserDeck } from '~/server/domain/decks/deck.service';
import {
    handleException,
    AuthenticationRequiredException,
    BadRequestException,
} from '~/server/utils/exceptions';

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user;

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        const deckId = getRouterParam(event, 'id');

        if (!deckId) {
            throw new BadRequestException('ID do deck é obrigatório.', { code: 'MISSING_DECK_ID' });
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(deckId)) {
            throw new BadRequestException('ID do deck inválido.', { code: 'INVALID_DECK_ID' });
        }

        await deleteUserDeck(deckId, user.sub);

        return {
            success: true,
            message: 'Deck excluído com sucesso.',
        };
    } catch (error) {
        return handleException(event, error);
    }
});
