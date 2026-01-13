/**
 * Auth Service Tests
 * 
 * Tests for authentication business logic using dependency injection.
 * Follows SOLID principles - dependencies are injected for testability.
 */

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import type { Mock } from 'node:test';


interface User {
    id: string;
    email: string;
    name: string | null;
    passwordHash: string | null;
    role: string;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
}

interface RefreshToken {
    tokenHash: string;
    userId: string;
    familyId: string;
    isRevoked: boolean;
    expiresAt: Date;
}

interface AuthDependencies {
    findUserByEmail: (email: string) => Promise<User | null>;
    findUserById: (id: string) => Promise<User | null>;
    createUser: (data: { email: string; name?: string; passwordHash: string; role: string }) => Promise<User>;
    createRefreshToken: (data: { tokenHash: string; userId: string; familyId: string; expiresAt: Date; ipAddress: string; userAgent: string }) => Promise<void>;
    findRefreshTokenByHash: (hash: string) => Promise<RefreshToken | null>;
    revokeRefreshToken: (hash: string) => Promise<void>;
    revokeTokenFamily: (familyId: string) => Promise<void>;
    resetLoginAttemptsAndUpdateLastLogin: (userId: string) => Promise<void>;
    updateFailedLoginAttempts: (userId: string, attempts: number, lockedUntil: Date | null) => Promise<void>;
    createAuditLog: (data: { userId?: string; action: string; ipAddress: string; userAgent: string; metadata?: Record<string, unknown> }) => Promise<void>;
    hashPassword: (password: string) => Promise<string>;
    verifyPassword: (hash: string, password: string) => Promise<boolean>;
    hashToken: (token: string) => string;
    generateTokenPair: (userId: string, role: string) => Promise<{ accessToken: string; refreshToken: string; expiresIn: number }>;
    getRefreshTokenExpiry: () => Date;
    generateFamilyId: () => string;
    checkRateLimit: (ip: string, action: string) => Promise<void>;
    incrementFailedAttempt: (ip: string, action: string) => Promise<void>;
    resetRateLimit: (ip: string, action: string) => Promise<void>;
}

// =============================================================================
// Testable Auth Service Factory
// =============================================================================

function createTestableAuthService(deps: AuthDependencies) {
    return {
        async registerUser(
            input: { email: string; password: string; name?: string },
            context: { ip: string; userAgent: string }
        ) {
            const existingUser = await deps.findUserByEmail(input.email);

            if (existingUser) {
                throw new Error('REGISTRATION_FAILED');
            }

            const passwordHash = await deps.hashPassword(input.password);

            const user = await deps.createUser({
                email: input.email.toLowerCase(),
                name: input.name,
                passwordHash,
                role: 'free',
            });

            await deps.createAuditLog({
                userId: user.id,
                action: 'REGISTER',
                ipAddress: context.ip,
                userAgent: context.userAgent,
            });

            return {
                success: true,
                message: 'Conta criada com sucesso.',
            };
        },

        async loginUser(
            input: { email: string; password: string },
            context: { ip: string; userAgent: string }
        ) {
            const genericError = new Error('INVALID_CREDENTIALS');

            await deps.checkRateLimit(context.ip, 'login');

            const user = await deps.findUserByEmail(input.email);

            if (!user) {
                await deps.incrementFailedAttempt(context.ip, 'login');
                await deps.createAuditLog({
                    action: 'FAILED_LOGIN',
                    ipAddress: context.ip,
                    userAgent: context.userAgent,
                    metadata: { email: input.email, reason: 'USER_NOT_FOUND' },
                });
                throw genericError;
            }

            if (user.lockedUntil && user.lockedUntil > new Date()) {
                throw new Error('ACCOUNT_LOCKED');
            }

            if (!user.passwordHash) {
                throw genericError;
            }

            const isValidPassword = await deps.verifyPassword(user.passwordHash, input.password);

            if (!isValidPassword) {
                const attempts = user.failedLoginAttempts + 1;
                let lockedUntil: Date | null = null;

                if (attempts >= 5) {
                    const lockMinutes = Math.min(15, attempts - 4);
                    lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
                }

                await deps.updateFailedLoginAttempts(user.id, attempts, lockedUntil);
                await deps.incrementFailedAttempt(context.ip, 'login');

                await deps.createAuditLog({
                    userId: user.id,
                    action: 'FAILED_LOGIN',
                    ipAddress: context.ip,
                    userAgent: context.userAgent,
                    metadata: { reason: 'INVALID_PASSWORD', attempts },
                });

                throw genericError;
            }

            const tokenPair = await deps.generateTokenPair(user.id, user.role);
            const tokenHash = deps.hashToken(tokenPair.refreshToken);
            const familyId = deps.generateFamilyId();

            await deps.createRefreshToken({
                tokenHash,
                userId: user.id,
                familyId,
                expiresAt: deps.getRefreshTokenExpiry(),
                ipAddress: context.ip,
                userAgent: context.userAgent,
            });

            await deps.resetLoginAttemptsAndUpdateLastLogin(user.id);
            await deps.resetRateLimit(context.ip, 'login');

            await deps.createAuditLog({
                userId: user.id,
                action: 'LOGIN',
                ipAddress: context.ip,
                userAgent: context.userAgent,
            });

            return {
                success: true,
                message: 'Login realizado com sucesso.',
                data: {
                    accessToken: tokenPair.accessToken,
                    expiresIn: tokenPair.expiresIn,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                    },
                },
                refreshToken: tokenPair.refreshToken,
            };
        },

        async refreshTokens(
            refreshToken: string,
            context: { ip: string; userAgent: string }
        ) {
            const tokenHash = deps.hashToken(refreshToken);
            const storedToken = await deps.findRefreshTokenByHash(tokenHash);

            if (!storedToken) {
                throw new Error('INVALID_TOKEN');
            }

            if (storedToken.isRevoked) {
                await deps.revokeTokenFamily(storedToken.familyId);
                await deps.createAuditLog({
                    userId: storedToken.userId,
                    action: 'TOKENS_REVOKED',
                    ipAddress: context.ip,
                    userAgent: context.userAgent,
                    metadata: { reason: 'REFRESH_TOKEN_REUSE', familyId: storedToken.familyId },
                });
                throw new Error('TOKEN_REUSE_DETECTED');
            }

            if (storedToken.expiresAt < new Date()) {
                await deps.revokeRefreshToken(tokenHash);
                throw new Error('TOKEN_EXPIRED');
            }

            const user = await deps.findUserById(storedToken.userId);

            if (!user) {
                throw new Error('USER_NOT_FOUND');
            }

            const tokenPair = await deps.generateTokenPair(user.id, user.role);

            await deps.revokeRefreshToken(tokenHash);

            const newTokenHash = deps.hashToken(tokenPair.refreshToken);

            await deps.createRefreshToken({
                tokenHash: newTokenHash,
                userId: user.id,
                familyId: storedToken.familyId,
                expiresAt: deps.getRefreshTokenExpiry(),
                ipAddress: context.ip,
                userAgent: context.userAgent,
            });

            await deps.createAuditLog({
                userId: user.id,
                action: 'TOKEN_REFRESH',
                ipAddress: context.ip,
                userAgent: context.userAgent,
            });

            return {
                success: true,
                message: 'Token atualizado.',
                data: {
                    accessToken: tokenPair.accessToken,
                    expiresIn: tokenPair.expiresIn,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                    },
                },
                refreshToken: tokenPair.refreshToken,
            };
        },
    };
}

// =============================================================================
// Test Helpers
// =============================================================================

type MockedFunction<T extends Function> = Mock<T> & T;


type MockedAuthDependencies = {
    [K in keyof AuthDependencies]: MockedFunction<AuthDependencies[K]>;
} & {
    getMock: <K extends keyof AuthDependencies>(name: K) => Mock<AuthDependencies[K]>;
};

function createMockDeps(): MockedAuthDependencies {
    const mocks = new Map<string, Mock<Function>>();

    function createMock<K extends keyof AuthDependencies>(
        name: K,
        impl: AuthDependencies[K]
    ): MockedFunction<AuthDependencies[K]> {
        const mockFn = mock.fn(impl);
        mocks.set(name, mockFn as Mock<Function>);
        return mockFn as MockedFunction<AuthDependencies[K]>;
    }

    const defaultUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        passwordHash: 'hashed',
        role: 'free',
        failedLoginAttempts: 0,
        lockedUntil: null,
    };

    return {
        getMock: <K extends keyof AuthDependencies>(name: K) =>
            mocks.get(name) as Mock<AuthDependencies[K]>,

        findUserByEmail: createMock('findUserByEmail', async (_email: string) => null),
        findUserById: createMock('findUserById', async (_id: string) => null),
        createUser: createMock('createUser', async (data) => ({
            ...defaultUser,
            email: data.email,
            name: data.name ?? null,
            passwordHash: data.passwordHash,
            role: data.role,
        })),
        createRefreshToken: createMock('createRefreshToken', async () => { }),
        findRefreshTokenByHash: createMock('findRefreshTokenByHash', async (_hash: string) => null),
        revokeRefreshToken: createMock('revokeRefreshToken', async () => { }),
        revokeTokenFamily: createMock('revokeTokenFamily', async () => { }),
        resetLoginAttemptsAndUpdateLastLogin: createMock('resetLoginAttemptsAndUpdateLastLogin', async () => { }),
        updateFailedLoginAttempts: createMock('updateFailedLoginAttempts', async () => { }),
        createAuditLog: createMock('createAuditLog', async () => { }),
        hashPassword: createMock('hashPassword', async (_password: string) => 'hashed_password'),
        verifyPassword: createMock('verifyPassword', async (_hash: string, _password: string) => true),
        hashToken: createMock('hashToken', (token: string) => `hashed_${token}`),
        generateTokenPair: createMock('generateTokenPair', async (_userId: string, _role: string) => ({
            accessToken: 'access_token_123',
            refreshToken: 'refresh_token_123',
            expiresIn: 3600,
        })),
        getRefreshTokenExpiry: createMock('getRefreshTokenExpiry', () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        generateFamilyId: createMock('generateFamilyId', () => 'family_123'),
        checkRateLimit: createMock('checkRateLimit', async () => { }),
        incrementFailedAttempt: createMock('incrementFailedAttempt', async () => { }),
        resetRateLimit: createMock('resetRateLimit', async () => { }),
    };
}

const mockContext = { ip: '127.0.0.1', userAgent: 'test-agent' };



describe('Auth Service', () => {
    describe('registerUser', () => {
        it('should hash password before storing', async () => {
            const deps = createMockDeps();
            const authService = createTestableAuthService(deps);

            await authService.registerUser(
                { email: 'test@example.com', password: 'SecurePass123!' },
                mockContext
            );

            assert.strictEqual(deps.hashPassword.mock.callCount(), 1);
            assert.deepStrictEqual(deps.hashPassword.mock.calls[0].arguments, ['SecurePass123!']);
        });

        it('should throw error if email already exists', async () => {
            const deps = createMockDeps();
            deps.findUserByEmail = mock.fn(() => Promise.resolve({
                id: 'existing-user',
                email: 'test@example.com',
                name: null,
                passwordHash: 'hash',
                role: 'free',
                failedLoginAttempts: 0,
                lockedUntil: null,
            }));

            const authService = createTestableAuthService(deps);

            await assert.rejects(
                authService.registerUser(
                    { email: 'test@example.com', password: 'SecurePass123!' },
                    mockContext
                ),
                { message: 'REGISTRATION_FAILED' }
            );
        });

        it('should normalize email to lowercase', async () => {
            const deps = createMockDeps();
            const authService = createTestableAuthService(deps);

            await authService.registerUser(
                { email: 'TEST@EXAMPLE.COM', password: 'SecurePass123!' },
                mockContext
            );

            const createUserCall = deps.createUser.mock.calls[0];
            assert.strictEqual(createUserCall.arguments[0].email, 'test@example.com');
        });

        it('should create audit log on successful registration', async () => {
            const deps = createMockDeps();
            const authService = createTestableAuthService(deps);

            await authService.registerUser(
                { email: 'test@example.com', password: 'SecurePass123!' },
                mockContext
            );

            assert.strictEqual(deps.createAuditLog.mock.callCount(), 1);
            const auditCall = deps.createAuditLog.mock.calls[0];
            assert.strictEqual(auditCall.arguments[0].action, 'REGISTER');
        });
    });

    describe('loginUser', () => {
        const mockUser: User = {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            passwordHash: 'hashed_password',
            role: 'free',
            failedLoginAttempts: 0,
            lockedUntil: null,
        };

        it('should return tokens on successful login', async () => {
            const deps = createMockDeps();
            deps.findUserByEmail = mock.fn(() => Promise.resolve(mockUser));
            const authService = createTestableAuthService(deps);

            const result = await authService.loginUser(
                { email: 'test@example.com', password: 'SecurePass123!' },
                mockContext
            );

            assert.strictEqual(result.success, true);
            assert.ok(result.data?.accessToken);
            assert.ok(result.refreshToken);
        });

        it('should throw generic error for non-existent user', async () => {
            const deps = createMockDeps();
            deps.findUserByEmail = mock.fn(() => Promise.resolve(null));
            const authService = createTestableAuthService(deps);

            await assert.rejects(
                authService.loginUser(
                    { email: 'nonexistent@example.com', password: 'password' },
                    mockContext
                ),
                { message: 'INVALID_CREDENTIALS' }
            );
        });

        it('should throw generic error for wrong password', async () => {
            const deps = createMockDeps();
            deps.findUserByEmail = mock.fn(() => Promise.resolve(mockUser));
            deps.verifyPassword = mock.fn(() => Promise.resolve(false));
            const authService = createTestableAuthService(deps);

            await assert.rejects(
                authService.loginUser(
                    { email: 'test@example.com', password: 'wrongpassword' },
                    mockContext
                ),
                { message: 'INVALID_CREDENTIALS' }
            );
        });

        it('should increment failed attempts on wrong password', async () => {
            const deps = createMockDeps();
            deps.findUserByEmail = mock.fn(() => Promise.resolve({ ...mockUser, failedLoginAttempts: 2 }));
            deps.verifyPassword = mock.fn(() => Promise.resolve(false));
            const authService = createTestableAuthService(deps);

            await assert.rejects(
                authService.loginUser(
                    { email: 'test@example.com', password: 'wrongpassword' },
                    mockContext
                ),
                { message: 'INVALID_CREDENTIALS' }
            );

            assert.strictEqual(deps.updateFailedLoginAttempts.mock.callCount(), 1);
            const updateCall = deps.updateFailedLoginAttempts.mock.calls[0];
            assert.strictEqual(updateCall.arguments[1], 3);
        });

        it('should lock account after 5 failed attempts', async () => {
            const deps = createMockDeps();
            deps.findUserByEmail = mock.fn(() => Promise.resolve({ ...mockUser, failedLoginAttempts: 4 }));
            deps.verifyPassword = mock.fn(() => Promise.resolve(false));
            const authService = createTestableAuthService(deps);

            await assert.rejects(
                authService.loginUser(
                    { email: 'test@example.com', password: 'wrongpassword' },
                    mockContext
                ),
                { message: 'INVALID_CREDENTIALS' }
            );

            const updateCall = deps.updateFailedLoginAttempts.mock.calls[0];
            assert.strictEqual(updateCall.arguments[1], 5);
            assert.ok(updateCall.arguments[2] !== null);
        });

        it('should reset failed attempts on successful login', async () => {
            const deps = createMockDeps();
            deps.findUserByEmail = mock.fn(() => Promise.resolve({ ...mockUser, failedLoginAttempts: 3 }));
            const authService = createTestableAuthService(deps);

            await authService.loginUser(
                { email: 'test@example.com', password: 'SecurePass123!' },
                mockContext
            );

            assert.strictEqual(deps.resetLoginAttemptsAndUpdateLastLogin.mock.callCount(), 1);
        });

        it('should throw error when account is locked', async () => {
            const deps = createMockDeps();
            deps.findUserByEmail = mock.fn(() => Promise.resolve({
                ...mockUser,
                lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // Locked for 10 more minutes
            }));
            const authService = createTestableAuthService(deps);

            await assert.rejects(
                authService.loginUser(
                    { email: 'test@example.com', password: 'password' },
                    mockContext
                ),
                { message: 'ACCOUNT_LOCKED' }
            );
        });
    });

    describe('refreshTokens', () => {
        const mockToken: RefreshToken = {
            tokenHash: 'hashed_token',
            userId: 'user-123',
            familyId: 'family-123',
            isRevoked: false,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        };

        const mockUser: User = {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            passwordHash: 'hash',
            role: 'free',
            failedLoginAttempts: 0,
            lockedUntil: null,
        };

        it('should return new token pair for valid refresh token', async () => {
            const deps = createMockDeps();
            deps.findRefreshTokenByHash = mock.fn(() => Promise.resolve(mockToken));
            deps.findUserById = mock.fn(() => Promise.resolve(mockUser));
            const authService = createTestableAuthService(deps);

            const result = await authService.refreshTokens('valid_refresh_token', mockContext);

            assert.strictEqual(result.success, true);
            assert.ok(result.data?.accessToken);
            assert.ok(result.refreshToken);
        });

        it('should revoke all family tokens on reuse detection', async () => {
            const deps = createMockDeps();
            deps.findRefreshTokenByHash = mock.fn(() => Promise.resolve({ ...mockToken, isRevoked: true }));
            const authService = createTestableAuthService(deps);

            await assert.rejects(
                authService.refreshTokens('reused_token', mockContext),
                { message: 'TOKEN_REUSE_DETECTED' }
            );

            assert.strictEqual(deps.revokeTokenFamily.mock.callCount(), 1);
        });

        it('should revoke old token after rotation', async () => {
            const deps = createMockDeps();
            deps.findRefreshTokenByHash = mock.fn(() => Promise.resolve(mockToken));
            deps.findUserById = mock.fn(() => Promise.resolve(mockUser));
            const authService = createTestableAuthService(deps);

            await authService.refreshTokens('valid_refresh_token', mockContext);

            assert.strictEqual(deps.revokeRefreshToken.mock.callCount(), 1);
        });

        it('should keep same family ID after rotation', async () => {
            const deps = createMockDeps();
            deps.findRefreshTokenByHash = mock.fn(() => Promise.resolve(mockToken));
            deps.findUserById = mock.fn(() => Promise.resolve(mockUser));
            const authService = createTestableAuthService(deps);

            await authService.refreshTokens('valid_refresh_token', mockContext);

            const createTokenCall = deps.createRefreshToken.mock.calls[0];
            assert.strictEqual(createTokenCall.arguments[0].familyId, 'family-123');
        });

        it('should throw error for expired token', async () => {
            const deps = createMockDeps();
            deps.findRefreshTokenByHash = mock.fn(() => Promise.resolve({
                ...mockToken,
                expiresAt: new Date(Date.now() - 1000), // Expired
            }));
            const authService = createTestableAuthService(deps);

            await assert.rejects(
                authService.refreshTokens('expired_token', mockContext),
                { message: 'TOKEN_EXPIRED' }
            );
        });

        it('should throw error for invalid token', async () => {
            const deps = createMockDeps();
            deps.findRefreshTokenByHash = mock.fn(() => Promise.resolve(null));
            const authService = createTestableAuthService(deps);

            await assert.rejects(
                authService.refreshTokens('invalid_token', mockContext),
                { message: 'INVALID_TOKEN' }
            );
        });
    });
});
