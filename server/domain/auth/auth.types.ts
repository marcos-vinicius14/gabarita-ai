/**
 * Authentication Types
 * 
 * Single Responsibility: Type definitions for authentication domain.
 * Used by repository, service, and API layers.
 */

// ============================================================================
// User Types
// ============================================================================

export interface User {
    id: string;
    email: string;
    name: string | null;
    passwordHash: string | null;
    role: UserRole;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    emailVerified: Date | null;
    lastLogin: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface NewUser {
    email: string;
    name?: string | null;
    passwordHash?: string | null;
    role?: UserRole;
}

export type UserRole = 'free' | 'trial' | 'pro' | 'admin';

// ============================================================================
// Refresh Token Types
// ============================================================================

export interface RefreshTokenRecord {
    id: string;
    tokenHash: string;
    userId: string;
    familyId: string;
    expiresAt: Date;
    isRevoked: boolean;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: Date;
}

export interface NewRefreshToken {
    tokenHash: string;
    userId: string;
    familyId: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
}

// ============================================================================
// Audit Log Types
// ============================================================================

export type AuditAction =
    | 'REGISTER'
    | 'LOGIN'
    | 'FAILED_LOGIN'
    | 'LOGOUT'
    | 'TOKEN_REFRESH'
    | 'PASSWORD_CHANGE'
    | 'PASSWORD_RESET_REQUEST'
    | 'PASSWORD_RESET_COMPLETE'
    | 'ACCOUNT_LOCKED'
    | 'ACCOUNT_UNLOCKED'
    | 'TOKENS_REVOKED';

export interface NewAuditLog {
    userId?: string | null;
    action: AuditAction;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface RequestContext {
    ip: string;
    userAgent: string;
}

export interface AuthResult {
    success: boolean;
    message: string;
    data?: {
        accessToken?: string;
        expiresIn?: number;
        user: {
            id: string;
            email: string;
            name: string | null;
            role: string;
        };
    };
    // Internal tokens for BFF session creation (not sent to client)
    accessToken?: string;
    refreshToken?: string;
}

export interface RegisterInput {
    email: string;
    password: string;
    name?: string;
}

export interface LoginInput {
    email: string;
    password: string;
}
