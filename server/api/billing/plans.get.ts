/**
 * GET /api/billing/plans
 * 
 * Returns available subscription plans for display.
 */

import { SUBSCRIPTION_PLANS, CREDIT_PACKAGES } from '~/server/domain/billing/billing.types';

export default defineEventHandler(async () => {
    return {
        success: true,
        message: 'Planos disponíveis.',
        data: {
            subscriptions: SUBSCRIPTION_PLANS.map(plan => ({
                id: plan.id,
                name: plan.name,
                price: (plan.priceInCents / 100).toFixed(2).replace('.', ','),
                priceInCents: plan.priceInCents,
                interval: plan.interval,
                features: plan.features,
                savings: 'savings' in plan ? plan.savings : undefined,
            })),
            credits: CREDIT_PACKAGES.map(pkg => ({
                id: pkg.id,
                credits: pkg.credits,
                price: (pkg.priceInCents / 100).toFixed(2).replace('.', ','),
                priceInCents: pkg.priceInCents,
                label: pkg.label,
            })),
        },
    };
});
