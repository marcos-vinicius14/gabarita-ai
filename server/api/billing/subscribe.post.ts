/**
 * POST /api/billing/subscribe
 * 
 * Subscribe to a plan (mock for development).
 * In production, this would create a Stripe checkout session.
 * 
 * Body: { planId: 'pro_monthly' | 'pro_annual' }
 */

import { mockActivateSubscription } from '~/server/domain/billing/subscription.service';
import { SUBSCRIPTION_PLANS } from '~/server/domain/billing/billing.types';
import {
    handleException,
    AuthenticationRequiredException,
    BadRequestException,
} from '~/server/utils/exceptions';

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user;

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        const body = await readBody(event);
        const { planId } = body;

        if (!planId) {
            throw new BadRequestException('planId é obrigatório.');
        }

        const validPlanIds = SUBSCRIPTION_PLANS.map(p => p.id);
        if (!validPlanIds.includes(planId)) {
            throw new BadRequestException(
                `planId inválido. Opções: ${validPlanIds.join(', ')}`
            );
        }

        const result = await mockActivateSubscription(user.sub, planId);

        return {
            success: true,
            message: `Assinatura ${result.planName} ativada com sucesso!`,
            data: {
                planId,
                planName: result.planName,
                endsAt: result.endsAt.toISOString(),
            },
        };
    } catch (error) {
        return handleException(event, error);
    }
});
