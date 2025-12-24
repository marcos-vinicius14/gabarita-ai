/**
 * POST /api/waitlist
 * 
 * API Handler for waitlist signups.
 * Single Responsibility: HTTP layer - validation, routing, response formatting.
 */

import { z } from 'zod';
import { joinWaitlist } from '~/server/domain/waitlist/waitlist.service';
import { db } from '~/server/utils/db';

const WaitlistRequestSchema = z.object({
    email: z.string().email('Por favor, insira um email válido.'),
    source: z.string().optional().default('landing_page'),
});

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);

        // Validate request body with Zod
        const parseResult = WaitlistRequestSchema.safeParse(body);

        if (!parseResult.success) {
            setResponseStatus(event, 400);
            return {
                success: false,
                message: parseResult.error.errors[0]?.message || 'Dados inválidos.',
            };
        }

        const { email, source } = parseResult.data;

        // Call the service layer
        const result = await joinWaitlist(db, email, source);

        return result;
    } catch (error) {
        console.error('[Waitlist API Error]', error);

        setResponseStatus(event, 500);
        return {
            success: false,
            message: 'Ocorreu um erro interno. Por favor, tente novamente.',
        };
    }
});
