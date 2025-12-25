/**
 * POST /api/auth/refresh
 * 
 * Manually refreshes the session tokens.
 * 
 * BFF Pattern:
 * - This is typically called internally by middleware
 * - Can also be called explicitly to force token refresh
 * - Updates session with new tokens
 */

import { refreshTokens } from '~/server/domain/auth/auth.service';
import { handleException, AuthenticationRequiredException } from '~/server/utils/exceptions';
import { getSession, updateSession, deleteSession } from '~/server/utils/auth/session';
import { SESSION_COOKIE } from '~/server/utils/auth/cookies';

export default defineEventHandler(async (event) => {
    try {
        const sessionId = getCookie(event, SESSION_COOKIE.name);

        if (!sessionId) {
            throw new AuthenticationRequiredException({
                details: { reason: 'NO_SESSION' },
            });
        }

        const session = await getSession(sessionId);

        if (!session) {
            deleteCookie(event, SESSION_COOKIE.name, { path: '/' });
            throw new AuthenticationRequiredException({
                details: { reason: 'INVALID_SESSION' },
            });
        }

        const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
        const userAgent = getHeader(event, 'user-agent') || 'unknown';

        const result = await refreshTokens(session.refreshToken, { ip, userAgent });

        if (result.accessToken && result.refreshToken) {
            await updateSession(sessionId, {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            });
        }

        return {
            success: result.success,
            message: result.message,
            data: result.data ? {
                user: result.data.user,
            } : undefined,
        };

    } catch (error) {
        const sessionId = getCookie(event, SESSION_COOKIE.name);
        if (sessionId) {
            await deleteSession(sessionId);
        }
        deleteCookie(event, SESSION_COOKIE.name, { path: '/' });

        return handleException(event, error);
    }
});