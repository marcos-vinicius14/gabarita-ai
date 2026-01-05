/**
 * GET /api/admin/users
 *
 * Returns list of all active users for admin dashboard.
 * Requires admin authentication.
 */

import {
    handleException,
    AuthenticationRequiredException,
    ForbiddenException,
} from '~/server/utils/exceptions';
import { listActiveUsers } from '~/server/domain/admin/users.service';

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user;

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        if (user.role !== 'admin') {
            throw new ForbiddenException('Você não tem permissão para acessar esta página.');
        }

        const users = await listActiveUsers();

        return { success: true, data: { users } };
    } catch (error) {
        return handleException(event, error);
    }
});
