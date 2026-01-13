/**
 * Authentication Service
 * 
 * Single Responsibility: Business logic for authentication.
 * Orchestrates password verification, token generation, and security measures.
 */

import { hashPassword, verifyPassword, hashToken } from '~/server/utils/auth/password';
import {
    generateTokenPair,
    getRefreshTokenExpiry,
    generateFamilyId,
} from '~/server/utils/auth/tokens';
import {
    checkRateLimit,
    incrementFailedAttempt,
    resetRateLimit,
    RateLimitError,
} from '~/server/utils/auth/rate-limit';
import {
    findUserByEmail,
    findUserById,
    createUser,
    createRefreshToken,
    findRefreshTokenByHash,
    revokeRefreshToken,
    revokeAllUserTokens,
    revokeTokenFamily,
    resetLoginAttemptsAndUpdateLastLogin,
    updateFailedLoginAttempts,
    createAuditLog,
} from './auth.repository';
import type {
    RegisterInput,
    LoginInput,
    RequestContext,
    AuthResult,
} from './auth.types';
import {
    InvalidCredentialsException,
    AccountLockedException,
    LoginRateLimitException,
    InvalidTokenException,
    TokenExpiredException,
    TokenReuseException,
    RegistrationFailedException,
} from '~/server/utils/exceptions';

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Registers a new user
 * 
 * @param input - Registration data
 * @param context - Request context (IP, User Agent)
 * @returns Success result
 */
export async function registerUser(
    input: RegisterInput,
    context: RequestContext
): Promise<AuthResult> {
    // Check if email already exists
    const existingUser = await findUserByEmail(input.email);

    if (existingUser) {
        // Return generic message to prevent email enumeration
        throw new RegistrationFailedException();
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    const user = await createUser({
        email: input.email,
        name: input.name,
        passwordHash,
        role: 'free',
    });

    await createAuditLog({
        userId: user.id,
        action: 'REGISTER',
        ipAddress: context.ip,
        userAgent: context.userAgent,
    });

    return {
        success: true,
        message: 'Conta criada com sucesso.',
    };
}

/**
 * Authenticates a user and generates tokens
 * 
 * @param input - Login credentials
 * @param context - Request context (IP, User Agent)
 * @returns Auth result with tokens
 */
export async function loginUser(
    input: LoginInput,
    context: RequestContext
): Promise<AuthResult> {
    const genericError = new InvalidCredentialsException();

    try {
        await checkRateLimit(context.ip, 'login');
    } catch (error) {
        if (error instanceof RateLimitError) {
            throw new LoginRateLimitException(error.retryAfter);
        }
        throw error;
    }

    const user = await findUserByEmail(input.email);

    if (!user) {
        await incrementFailedAttempt(context.ip, 'login');

        await createAuditLog({
            action: 'FAILED_LOGIN',
            ipAddress: context.ip,
            userAgent: context.userAgent,
            metadata: { email: input.email, reason: 'USER_NOT_FOUND' },
        });

        throw genericError;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new AccountLockedException(user.lockedUntil);
    }
    if (!user.passwordHash) {
        throw genericError;
    }

    const isValidPassword = await verifyPassword(user.passwordHash, input.password);

    if (!isValidPassword) {
        const attempts = user.failedLoginAttempts + 1;
        let lockedUntil: Date | null = null;

        if (attempts >= 5) {
            const lockMinutes = Math.min(15, attempts - 4);
            lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
        }

        await updateFailedLoginAttempts(user.id, attempts, lockedUntil);
        await incrementFailedAttempt(context.ip, 'login');

        await createAuditLog({
            userId: user.id,
            action: 'FAILED_LOGIN',
            ipAddress: context.ip,
            userAgent: context.userAgent,
            metadata: { reason: 'INVALID_PASSWORD', attempts },
        });

        if (lockedUntil) {
            await createAuditLog({
                userId: user.id,
                action: 'ACCOUNT_LOCKED',
                ipAddress: context.ip,
                userAgent: context.userAgent,
                metadata: { lockedUntil: lockedUntil.toISOString() },
            });
        }

        throw genericError;
    }

    const tokenPair = await generateTokenPair(user.id, user.role);

    const tokenHash = hashToken(tokenPair.refreshToken);
    const familyId = generateFamilyId();

    await createRefreshToken({
        tokenHash,
        userId: user.id,
        familyId,
        expiresAt: getRefreshTokenExpiry(),
        ipAddress: context.ip,
        userAgent: context.userAgent,
    });

    await resetLoginAttemptsAndUpdateLastLogin(user.id);
    await resetLoginAttemptsAndUpdateLastLogin(user.id);
    await resetRateLimit(context.ip, 'login');

    await createAuditLog({
        userId: user.id,
        action: 'LOGIN',
        ipAddress: context.ip,
        userAgent: context.userAgent,
    });

    return {
        success: true,
        message: 'Login realizado com sucesso. Seja bem-vindo!',
        data: {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
    };
}

/**
 * Refreshes access token using refresh token
 * 
 * @param refreshToken - Current refresh token
 * @param context - Request context
 * @returns New token pair
 */
export async function refreshTokens(
    refreshToken: string,
    context: RequestContext
): Promise<AuthResult> {
    const tokenHash = hashToken(refreshToken);

    const storedToken = await findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
        throw new InvalidTokenException();
    }

    if (storedToken.isRevoked) {
        await revokeTokenFamily(storedToken.familyId);

        await createAuditLog({
            userId: storedToken.userId,
            action: 'TOKENS_REVOKED',
            ipAddress: context.ip,
            userAgent: context.userAgent,
            metadata: {
                reason: 'REFRESH_TOKEN_REUSE',
                familyId: storedToken.familyId,
            },
        });

        throw new TokenReuseException();
    }

    if (storedToken.expiresAt < new Date()) {
        await revokeRefreshToken(tokenHash);
        throw new TokenExpiredException();
    }
    const user = await findUserById(storedToken.userId);

    if (!user) {
        throw new InvalidTokenException({ details: { reason: 'USER_NOT_FOUND' } });
    }

    const tokenPair = await generateTokenPair(user.id, user.role);

    await revokeRefreshToken(tokenHash);

    const newTokenHash = hashToken(tokenPair.refreshToken);

    await createRefreshToken({
        tokenHash: newTokenHash,
        userId: user.id,
        familyId: storedToken.familyId,
        expiresAt: getRefreshTokenExpiry(),
        ipAddress: context.ip,
        userAgent: context.userAgent,
    });

    await createAuditLog({
        userId: user.id,
        action: 'TOKEN_REFRESH',
        ipAddress: context.ip,
        userAgent: context.userAgent,
    });

    return {
        success: true,
        message: 'Token refreshed.',
        data: {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
    };
}

/**
 * Logs out a user by revoking their refresh token
 * 
 * @param refreshToken - Refresh token to revoke
 * @param context - Request context
 */
export async function logoutUser(
    refreshToken: string,
    context: RequestContext
): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const storedToken = await findRefreshTokenByHash(tokenHash);

    if (storedToken) {
        await revokeRefreshToken(tokenHash);

        await createAuditLog({
            userId: storedToken.userId,
            action: 'LOGOUT',
            ipAddress: context.ip,
            userAgent: context.userAgent,
        });
    }
}

/**
 * Revokes all sessions for a user (security measure)
 * 
 * @param userId - User ID
 * @param context - Request context
 */
export async function revokeAllSessions(
    userId: string,
    context: RequestContext
): Promise<void> {
    await revokeAllUserTokens(userId);

    await createAuditLog({
        userId,
        action: 'TOKENS_REVOKED',
        ipAddress: context.ip,
        userAgent: context.userAgent,
        metadata: { reason: 'USER_INITIATED' },
    });
}

export { RateLimitError };
