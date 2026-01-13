/**
 * Admin Users Service
 * 
 * Domain: Admin
 * Responsibility: Business logic for admin user management
 */

import {
    findAllActiveUsers,
    findUserById,
    softDeleteUser as repoSoftDelete,
    updateUserRole as repoUpdateRole,
    blockUser as repoBlockUser,
    unblockUser as repoUnblockUser,
} from './users.repository';
import type { AdminUserListItem, UpdateUserInput } from './users.types';

/**
 * Get all active users formatted for the admin table
 */
export async function listActiveUsers(): Promise<AdminUserListItem[]> {
    const users = await findAllActiveUsers();

    return users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        isBlocked: !!user.blockedAt,
    }));
}

/**
 * Soft delete a user
 */
export async function deleteUser(userId: string, adminId: string): Promise<void> {
    const user = await findUserById(userId);

    if (!user) {
        throw new Error('Usuário não encontrado.');
    }

    if (user.deletedAt) {
        throw new Error('Usuário já foi excluído.');
    }

    if (user.id === adminId) {
        throw new Error('Você não pode excluir sua própria conta.');
    }

    await repoSoftDelete(userId);
}

/**
 * Update user properties (role, blocked status)
 */
export async function updateUser(userId: string, adminId: string, input: UpdateUserInput): Promise<void> {
    const user = await findUserById(userId);

    if (!user) {
        throw new Error('Usuário não encontrado.');
    }

    if (user.deletedAt) {
        throw new Error('Não é possível alterar um usuário excluído.');
    }

    if (user.id === adminId && input.role && input.role !== 'admin') {
        throw new Error('Você não pode remover seu próprio privilégio de admin.');
    }

    if (user.id === adminId && input.blocked) {
        throw new Error('Você não pode bloquear sua própria conta.');
    }

    if (input.role !== undefined) {
        await repoUpdateRole(userId, input.role);
    }

    if (input.blocked !== undefined) {
        if (input.blocked) {
            await repoBlockUser(userId);
        } else {
            await repoUnblockUser(userId);
        }
    }
}
