/**
 * POST /api/auth/logout
 * 
 * Logs out user by destroying the session.
 * 
 * BFF Pattern:
 * - Deletes server-side session
 * - Clears session cookie
 * - Revokes refresh token in database
 */

import { logoutUser } from '~/server/domain/auth/auth.service';
import { getSession, deleteSession } from '~/server/utils/auth/session';
import { SESSION_COOKIE } from '~/server/utils/auth/cookies';

export default defineEventHandler(async (event) => {
    try {
        const sessionId = getCookie(event, SESSION_COOKIE.name);

        if (sessionId) {
            const session = await getSession(sessionId);

            if (session) {
                const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
                const userAgent = getHeader(event, 'user-agent') || 'unknown';

                await logoutUser(session.refreshToken, { ip, userAgent });
                await deleteSession(sessionId);
            }
        }

        deleteCookie(event, SESSION_COOKIE.name, {
            path: '/',
        });

        return {
            success: true,
            message: 'Usuário deslogado com sucesso.',
        };

    } catch {
        deleteCookie(event, SESSION_COOKIE.name, {
            path: '/',
        });

        return {
            success: true,
            message: 'Usuário deslogado com sucesso.',
        };
    }
});
