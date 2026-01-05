/**
 * GET /api/auth/me
 * 
 * Returns the current authenticated user data.
 * 
 * BFF Pattern:
 * - User is extracted from session by middleware
 * - Available in event.context.user
 */

import { findUserById } from '~/server/domain/auth/auth.repository';
import { handleException, AuthenticationRequiredException } from '~/server/utils/exceptions';

export default defineEventHandler(async (event) => {
    try {
        const sessionUser = event.context.user;

        if (!sessionUser) {
            setResponseStatus(event, 401);
            return {
                success: false,
                message: 'Token de acesso não fornecido.',
                code: 'NO_TOKEN',
            };
        }

        const user = await findUserById(sessionUser.sub);

        if (!user) {
            setResponseStatus(event, 401);
            return {
                success: false,
                message: 'Usuário não encontrado.',
                code: 'USER_NOT_FOUND',
            };
        }

        return {
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    emailVerified: !!user.emailVerified,
                    createdAt: user.createdAt,
                },
            },
        };

    } catch (error) {
        return handleException(event, error);
    }
});
