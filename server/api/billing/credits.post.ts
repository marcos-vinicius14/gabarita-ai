/**
 * POST /api/billing/credits
 * 
 * Add credits to user account (mock for development).
 * In production, this would be triggered by payment webhook.
 * 
 * Body: { packageId: 'starter' | 'standard' | 'power' }
 */

import { purchaseCredits } from '~/server/domain/billing/billing.service';
import { CREDIT_PACKAGES } from '~/server/domain/billing/billing.types';
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
        const { packageId } = body;

        if (!packageId) {
            throw new BadRequestException('packageId é obrigatório.');
        }

        const validPackageIds = CREDIT_PACKAGES.map(p => p.id);
        if (!validPackageIds.includes(packageId)) {
            throw new BadRequestException(
                `packageId inválido. Opções: ${validPackageIds.join(', ')}`
            );
        }

        const result = await purchaseCredits(user.sub, packageId);

        return {
            success: true,
            message: `${result.credits} créditos adicionados com sucesso!`,
            data: {
                creditsAdded: result.credits,
                newBalance: result.newBalance,
            },
        };
    } catch (error) {
        return handleException(event, error);
    }
});
