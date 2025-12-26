/**
 * GET /api/trial/status
 * 
 * Returns the current trial status for the authenticated user.
 * Includes days remaining, expiry date, and effective role.
 */

import { getTrialStatus } from '~/server/domain/trial/trial.service';
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

        const user = await findUserById(sessionUser.sub);

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        const status = getTrialStatus({
            id: user.id,
            role: user.role,
            trialExpiresAt: user.trialExpiresAt,
        });

        return {
            success: true,
            message: 'Status do período de teste.',
            data: {
                isOnTrial: status.isOnTrial,
                daysRemaining: status.daysRemaining,
                expiresAt: status.expiresAt?.toISOString() ?? null,
                effectiveRole: status.effectiveRole,
            },
        };
    } catch (error) {
        return handleException(event, error);
    }
});
