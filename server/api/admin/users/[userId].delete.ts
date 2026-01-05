/**
 * DELETE /api/admin/users/:userId
 *
 * Soft deletes a user (sets deletedAt timestamp).
 * Requires admin authentication.
 */

import { z } from 'zod';
import {
    handleException,
    AuthenticationRequiredException,
    ForbiddenException,
    BadRequestException,
} from '~/server/utils/exceptions';
import { deleteUser } from '~/server/domain/admin/users.service';

const paramsSchema = z.object({
    userId: z.string().uuid(),
});

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user;

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        if (user.role !== 'admin') {
            throw new ForbiddenException('Você não tem permissão para realizar esta ação.');
        }

        const params = paramsSchema.safeParse(getRouterParams(event));

        if (!params.success) {
            throw new BadRequestException('ID de usuário inválido.');
        }

        await deleteUser(params.data.userId, user.sub);

        return { success: true, message: 'Usuário excluído com sucesso.' };
    } catch (error) {
        return handleException(event, error);
    }
});
