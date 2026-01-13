/**
 * Cookie Configuration
 * 
 * Centralized cookie settings for authentication.
 * All auth cookies use HttpOnly + Secure + SameSite=Strict.
 */

export const SESSION_COOKIE = {
    name: 'session_id',
    options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    },
};

export const REFRESH_TOKEN_COOKIE = {
    name: 'refresh_token',
    options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/api/auth',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    },
};
