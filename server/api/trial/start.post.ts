/**
 * POST /api/trial/start
 * 
 * Starts a 7-day trial for the authenticated user.
 * Requires authentication and must be on 'free' plan.
 */

import { startTrial, getTrialStatus } from '~/server/domain/trial/trial.service';
import { findUserById } from '~/server/domain/auth/auth.repository';
import {
    handleException,
    AuthenticationRequiredException,
} from '~/server/utils/exceptions';

export default defineEventHandler(async (event) => {
    try {
        const sessionUser = event.context.user;

        if (!sessionUser) {
            throw new AuthenticationRequiredException();
        }

        // Get full user details
        const user = await findUserById(sessionUser.sub);

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        const expiresAt = await startTrial(
            user.id,
            user.role,
            user.trialExpiresAt
        );

        return {
            success: true,
            message: 'Seu período de teste de 7 dias foi ativado!',
            data: {
                trialExpiresAt: expiresAt.toISOString(),
                daysRemaining: 7,
            },
        };
    } catch (error) {
        return handleException(event, error);
    }
});
