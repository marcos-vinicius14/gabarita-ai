/**
 * GET /api/billing/usage
 * 
 * Returns current usage status for the authenticated user.
 * Includes monthly uploads, credits, deck count, and limits.
 */

import { getUserUsageStatus } from '~/server/domain/billing/billing.service';
import {
    handleException,
    AuthenticationRequiredException,
} from '~/server/utils/exceptions';

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user;

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        const usage = await getUserUsageStatus(user.sub);

        return {
            success: true,
            message: 'Status de uso recuperado com sucesso.',
            data: {
                plan: usage.plan,
                monthlyUploads: usage.monthlyUploads,
                credits: usage.credits,
                decks: usage.decks,
                canUpload: usage.canUpload,
                nextResetDate: usage.nextResetDate?.toISOString() ?? null,
            },
        };
    } catch (error) {
        return handleException(event, error);
    }
});
