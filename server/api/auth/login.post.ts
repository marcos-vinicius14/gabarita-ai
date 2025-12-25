/**
 * POST /api/auth/login
 * 
 * Authenticates a user and returns tokens.
 * 
 * Security:
 * - Rate limiting (Redis-based, exponential backoff)
 * - Generic error messages (prevents enumeration)
 * - Refresh token in HTTP-Only cookie
 * - Access token in response body
 */

import { z } from 'zod';
import { loginUser } from '~/server/domain/auth/auth.service';
import { handleException, ValidationException } from '~/server/utils/exceptions';

const LoginSchema = z.object({
    email: z.string().email('Por favor, insira um email válido'),
    password: z.string().min(1, 'Por favor, insira uma senha'),
});

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
        const body = await readBody(event);

        const parseResult = LoginSchema.safeParse(body);

        if (!parseResult.success) {
            const errors: Record<string, string[]> = {};
            parseResult.error.errors.forEach((err) => {
                const field = err.path[0]?.toString() ?? 'form';
                if (!errors[field]) errors[field] = [];
                errors[field].push(err.message);
            });

            throw new ValidationException(
                'Por favor, corrija os erros de validação.',
                errors
            );
        }

        const { email, password } = parseResult.data;

        const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
        const userAgent = getHeader(event, 'user-agent') || 'unknown';

        const result = await loginUser(
            { email, password },
            { ip, userAgent }
        );

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
        return handleException(event, error);
    }
});

