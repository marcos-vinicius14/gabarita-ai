/**
 * POST /api/auth/register
 * 
 * Registers a new user account.
 * 
 * Security:
 * - Password complexity validation (min 8 chars, mixed case, numbers, special)
 * - Generic error messages (prevents email enumeration)
 */

import { z } from 'zod';
import { registerUser } from '~/server/domain/auth/auth.service';
import { handleException, ValidationException } from '~/server/utils/exceptions';


const passwordSchema = z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
    .regex(/[^a-zA-Z0-9]/, 'A senha deve conter pelo menos um caractere especial');

const RegisterSchema = z.object({
    email: z.string().email('Por favor, insira um email válido'),
    password: passwordSchema,
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50).optional(),
});

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        const parseResult = RegisterSchema.safeParse(body);

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

        const { email, password, name } = parseResult.data;

        const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
        const userAgent = getHeader(event, 'user-agent') || 'unknown';

        const result = await registerUser(
            { email, password, name },
            { ip, userAgent }
        );

        setResponseStatus(event, 201);
        return result;

    } catch (error) {
        return handleException(event, error);
    }
});

