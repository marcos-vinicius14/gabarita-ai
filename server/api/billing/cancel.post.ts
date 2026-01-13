/**
 * POST /api/billing/cancel
 * 
 * Cancel subscription (mock for development).
 * User keeps access until end of billing period.
 */

import { mockCancelSubscription } from '~/server/domain/billing/subscription.service';
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

        await mockCancelSubscription(user.sub);

        return {
            success: true,
            message: 'Assinatura cancelada. Você terá acesso até o fim do período pago.',
        };
    } catch (error) {
        return handleException(event, error);
    }
});
