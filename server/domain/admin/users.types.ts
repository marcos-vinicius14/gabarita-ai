/**
 * Admin Users Types
 * 
 * Domain: Admin
 * Responsibility: Type definitions for admin user management
 */

export interface AdminUser {
    id: string;
    email: string;
    name: string | null;
    role: 'free' | 'pro' | 'admin';
    createdAt: Date;
    blockedAt: Date | null;
    deletedAt: Date | null;
}

export interface AdminUserListItem {
    id: string;
    email: string;
    name: string | null;
    role: 'free' | 'pro' | 'admin';
    createdAt: string;
    isBlocked: boolean;
}

export type UpdateUserInput = {
    role?: 'free' | 'pro' | 'admin';
    blocked?: boolean;
};
