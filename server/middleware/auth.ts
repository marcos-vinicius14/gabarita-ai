/**
 * Authentication Middleware
 * 
 * BFF Pattern:
 * - Reads session from cookie
 * - Verifies access token from session
 * - Automatically refreshes expired tokens
 * - Attaches user payload to event.context
 * 
 * Usage in routes:
 * - Access user: event.context.user
 * - Access session: event.context.session
 * - Check role: event.context.user?.role
 */

import { verifyAccessToken, type TokenPayload } from '~/server/utils/auth/tokens';
import { getSession, updateSession, type Session } from '~/server/utils/auth/session';
import { refreshTokens } from '~/server/domain/auth/auth.service';
import { SESSION_COOKIE } from '~/server/utils/auth/cookies';

declare module 'h3' {
    interface H3EventContext {
        user?: TokenPayload;
        session?: Session;
    }
}

export default defineEventHandler(async (event) => {
    const path = getRequestURL(event).pathname;

    const publicAuthRoutes = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/logout',
        '/api/auth/refresh',
    ];

    if (publicAuthRoutes.includes(path)) {
        return;
    }

    if (!path.startsWith('/api/')) {
        return;
    }

    const sessionId = getCookie(event, SESSION_COOKIE.name);

    // Debug logging for auth issues
    const allCookies = getHeader(event, 'cookie');
    console.log('[Auth Debug]', {
        path,
        sessionCookieName: SESSION_COOKIE.name,
        sessionId: sessionId ? `${sessionId.substring(0, 10)}...` : 'NOT FOUND',
        allCookies: allCookies ? allCookies.substring(0, 100) : 'NO COOKIES',
    });

    if (!sessionId) {
        return;
    }

    const session = await getSession(sessionId);
    console.log('[Auth Debug] Session lookup:', session ? 'FOUND' : 'NOT FOUND');

    if (!session) {
        deleteCookie(event, SESSION_COOKIE.name, { path: '/' });
        return;
    }

    try {
        const payload = await verifyAccessToken(session.accessToken);
        event.context.user = payload;
        event.context.session = session;
    } catch {
        try {
            const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
            const userAgent = getHeader(event, 'user-agent') || 'unknown';

            const result = await refreshTokens(session.refreshToken, { ip, userAgent });

            if (result.accessToken && result.refreshToken) {
                await updateSession(sessionId, {
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                });

                const payload = await verifyAccessToken(result.accessToken);
                event.context.user = payload;
                event.context.session = {
                    ...session,
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                };
            }
        } catch {
            // Refresh also failed - session is invalid
            deleteCookie(event, SESSION_COOKIE.name, { path: '/' });
        }
    }
});
