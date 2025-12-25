/**
 * POST /api/auth/refresh
 * 
 * Refreshes the access token using the refresh token from cookie.
 * 
 * Security:
 * - Token rotation (new refresh token on each use)
 * - Reuse detection (revokes all family tokens on reuse)
 * - HTTP-Only cookie for refresh token
 */

import { refreshTokens } from '~/server/domain/auth/auth.service';
import { handleException, AuthenticationRequiredException } from '~/server/utils/exceptions';

const REFRESH_TOKEN_COOKIE = {
    name: 'refresh_token',
    options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/api/auth',
        maxAge: 60 * 60 * 24 * 7,
    },
};

export default defineEventHandler(async (event) => {
    try {
        const refreshToken = getCookie(event, REFRESH_TOKEN_COOKIE.name);

        if (!refreshToken) {
            throw new AuthenticationRequiredException({
                details: { reason: 'NO_TOKEN' },
            });
        }

        const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
        const userAgent = getHeader(event, 'user-agent') || 'unknown';

        const result = await refreshTokens(refreshToken, { ip, userAgent });

        if (result.refreshToken) {
            setCookie(
                event,
                REFRESH_TOKEN_COOKIE.name,
                result.refreshToken,
                REFRESH_TOKEN_COOKIE.options
            );
        }

        return {
            success: result.success,
            message: result.message,
            data: result.data,
        };

    } catch (error) {
        deleteCookie(event, REFRESH_TOKEN_COOKIE.name, {
            path: '/api/auth',
        });

        return handleException(event, error);
    }
});