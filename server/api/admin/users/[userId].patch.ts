/**
 * PATCH /api/admin/users/:userId
 *
 * Updates a user's role or blocked status.
 * Requires admin authentication.
 */

import { z } from 'zod';
import {
    handleException,
    AuthenticationRequiredException,
    ForbiddenException,
    BadRequestException,
    ValidationException,
} from '~/server/utils/exceptions';
import { updateUser } from '~/server/domain/admin/users.service';

const paramsSchema = z.object({
    userId: z.string().uuid(),
});

const bodySchema = z.object({
    role: z.enum(['free', 'pro', 'admin']).optional(),
    blocked: z.boolean().optional(),
}).refine(data => data.role !== undefined || data.blocked !== undefined, {
    message: 'Pelo menos um campo deve ser fornecido (role ou blocked).',
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

        const body = await readBody(event);
        const bodyParsed = bodySchema.safeParse(body);

        if (!bodyParsed.success) {
            throw new ValidationException(
                'Dados inválidos.',
                bodyParsed.error.flatten().fieldErrors
            );
        }

        await updateUser(params.data.userId, user.sub, bodyParsed.data);

        return { success: true, message: 'Usuário atualizado com sucesso.' };
    } catch (error) {
        return handleException(event, error);
    }
});w
