/**
 * POST /api/auth/login
 * 
 * Authenticates a user and creates a server-side session.
 * 
 * BFF Pattern:
 * - Tokens are stored server-side (never exposed to client)
 * - Client receives only a session ID in HttpOnly cookie
 */

import { z } from 'zod';
import { loginUser } from '~/server/domain/auth/auth.service';
import { handleException, ValidationException } from '~/server/utils/exceptions';
import { createSession } from '~/server/utils/auth/session';
import { SESSION_COOKIE } from '~/server/utils/auth/cookies';

const LoginSchema = z.object({
    email: z.string().email('Por favor, insira um email válido'),
    password: z.string().min(1, 'Por favor, insira uma senha'),
});

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

        if (result.data && result.accessToken && result.refreshToken) {
            const sessionId = await createSession({
                userId: result.data.user.id,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            });

            setCookie(event, SESSION_COOKIE.name, sessionId, SESSION_COOKIE.options);
        }

        return {
            success: result.success,
            message: result.message,
            data: result.data ? {
                user: result.data.user,
            } : undefined,
        };

    } catch (error) {
        return handleException(event, error);
    }
});
