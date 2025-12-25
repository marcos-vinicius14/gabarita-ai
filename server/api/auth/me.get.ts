/**
 * GET /api/auth/me
 * 
 * Returns the current authenticated user's information.
 * 
 * Security:
 * - Requires valid access token in Authorization header
 */

import { verifyAccessToken } from '~/server/utils/auth/tokens';
import { findUserById } from '~/server/domain/auth/auth.repository';

export default defineEventHandler(async (event) => {
    try {
        const authHeader = getHeader(event, 'authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            setResponseStatus(event, 401);
            return {
                success: false,
                message: 'Token de acesso não fornecido.',
                code: 'NO_TOKEN',
            };
        }

        const accessToken = authHeader.substring(7);

        let payload;
        try {
            payload = await verifyAccessToken(accessToken);
        } catch {
            setResponseStatus(event, 401);
            return {
                success: false,
                message: 'Token de acesso inválido ou expirado.',
                code: 'INVALID_TOKEN',
            };
        }
        const user = await findUserById(payload.sub);

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
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                emailVerified: !!user.emailVerified,
                createdAt: user.createdAt,
            },
        };

    } catch (error) {
        console.error('[Auth Me Error]', error);

        setResponseStatus(event, 500);
        return {
            success: false,
            message: 'Erro inesperado. Tente novamente mais tarde.',
        };
    }
});
