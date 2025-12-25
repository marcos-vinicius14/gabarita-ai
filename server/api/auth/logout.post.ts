/**
 * POST /api/auth/logout
 * 
 * Logs out the user by revoking the refresh token.
 * 
 * Security:
 * - Revokes token in database
 * - Clears HTTP-Only cookie
 */

import { logoutUser } from '~/server/domain/auth/auth.service';

const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

export default defineEventHandler(async (event) => {
    try {
        const refreshToken = getCookie(event, REFRESH_TOKEN_COOKIE_NAME);

        if (refreshToken) {
            const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
            const userAgent = getHeader(event, 'user-agent') || 'unknown';

            await logoutUser(refreshToken, { ip, userAgent });
        }

        deleteCookie(event, REFRESH_TOKEN_COOKIE_NAME, {
            path: '/api/auth',
        });

        return {
            success: true,
            message: 'Usuário deslogado com sucesso.',
        };

    } catch (error) {
        console.error('[Auth Logout Error]', error);

        deleteCookie(event, REFRESH_TOKEN_COOKIE_NAME, {
            path: '/api/auth',
        });

        return {
            success: true,
            message: 'Usuário deslogado com sucesso.',
        };
    }
});
