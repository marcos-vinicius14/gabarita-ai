/**
 * Admin Users Repository
 * 
 * Domain: Admin
 * Responsibility: Database operations for admin user management
 */

import { eq, isNull, sql } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { users } from '~/server/domain/auth/schema';
import type { AdminUser } from './users.types';

/**
 * Find all active (non-deleted) users
 */
export async function findAllActiveUsers(): Promise<AdminUser[]> {
    const result = await (db as any)
        .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            createdAt: users.createdAt,
            blockedAt: users.blockedAt,
            deletedAt: users.deletedAt,
        })
        .from(users)
        .where(isNull(users.deletedAt))
        .orderBy(users.createdAt);

    return result as AdminUser[];
}

/**
 * Find user by ID (including deleted)
 */
export async function findUserById(userId: string): Promise<AdminUser | undefined> {
    const result = await (db as any)
        .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            createdAt: users.createdAt,
            blockedAt: users.blockedAt,
            deletedAt: users.deletedAt,
        })
        .from(users)
        .where(eq(users.id, userId));

    return result[0] as AdminUser | undefined;
}

/**
 * Soft delete a user
 */
export async function softDeleteUser(userId: string): Promise<void> {
    await (db as any)
        .update(users)
        .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, role: 'free' | 'pro' | 'admin'): Promise<void> {
    await (db as any)
        .update(users)
        .set({
            role,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

/**
 * Block a user (set blockedAt timestamp)
 */
export async function blockUser(userId: string): Promise<void> {
    await (db as any)
        .update(users)
        .set({
            blockedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

/**
 * Unblock a user (clear blockedAt timestamp)
 */
export async function unblockUser(userId: string): Promise<void> {
    await (db as any)
        .update(users)
        .set({
            blockedAt: null,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}
