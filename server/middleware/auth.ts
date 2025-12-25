/**
 * Authentication Middleware
 * 
 * Extracts and verifies JWT from Authorization header.
 * Attaches user payload to event.context for protected routes.
 * 
 * Usage in routes:
 * - Access user: event.context.user
 * - Check role: event.context.user?.role
 */

import { verifyAccessToken, type TokenPayload } from '~/server/utils/auth/tokens';

declare module 'h3' {
    interface H3EventContext {
        user?: TokenPayload;
    }
}

export default defineEventHandler(async (event) => {
    const path = getRequestURL(event).pathname;

    if (path.startsWith('/api/auth/')) {
        return;
    }

    if (!path.startsWith('/api/')) {
        return;
    }
    const authHeader = getHeader(event, 'authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return;
    }

    const accessToken = authHeader.substring(7);

    try {
        const payload = await verifyAccessToken(accessToken);
        event.context.user = payload;
    } catch {
        // Invalid token - let the route decide how to handle
        // Don't throw here, just don't set user
    }
});
