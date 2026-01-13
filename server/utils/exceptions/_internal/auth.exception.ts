/**
 * Authentication & Authorization Exceptions
 * 
 * Domain-specific exceptions for auth operations.
 * These provide semantic meaning and consistent error handling.
 */

import {
    UnauthorizedException,
    ForbiddenException,
    TooManyRequestsException,
    BadRequestException,
    type HttpExceptionOptions,
} from './http.exception';

// ============================================================================
// Authentication Exceptions
// ============================================================================

/**
 * Invalid credentials (email or password)
 * Uses generic message to prevent enumeration attacks
 */
export class InvalidCredentialsException extends UnauthorizedException {
    constructor(options?: Partial<Omit<HttpExceptionOptions, 'code'>>) {
        super('Email ou senha inválidos.', {
            code: 'INVALID_CREDENTIALS',
            ...options,
        });
    }
}


export class AccountLockedException extends ForbiddenException {
    public readonly lockedUntil: Date;
    public readonly minutesRemaining: number;

    constructor(lockedUntil: Date, options?: Partial<Omit<HttpExceptionOptions, 'code'>>) {
        const minutesRemaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
        super(`Conta bloqueada temporariamente. Tente novamente em ${minutesRemaining} minuto(s).`, {
            code: 'ACCOUNT_LOCKED',
            details: { lockedUntil: lockedUntil.toISOString(), minutesRemaining },
            ...options,
        });
        this.lockedUntil = lockedUntil;
        this.minutesRemaining = minutesRemaining;
    }
}

export class LoginRateLimitException extends TooManyRequestsException {
    constructor(retryAfterSeconds: number, options?: Partial<Omit<HttpExceptionOptions, 'code'>>) {
        const minutes = Math.ceil(retryAfterSeconds / 60);
        super(
            `Muitas tentativas de login. Aguarde ${minutes} minuto(s) e tente novamente.`,
            retryAfterSeconds,
            {
                code: 'LOGIN_RATE_LIMITED',
                ...options,
            }
        );
    }
}

// ============================================================================
// Token Exceptions
// ============================================================================


export class InvalidTokenException extends UnauthorizedException {
    constructor(options?: Partial<Omit<HttpExceptionOptions, 'code'>>) {
        super('Sessão inválida. Por favor, faça login novamente.', {
            code: 'INVALID_TOKEN',
            ...options,
        });
    }
}


export class TokenExpiredException extends UnauthorizedException {
    constructor(options?: Partial<Omit<HttpExceptionOptions, 'code'>>) {
        super('Sua sessão expirou. Por favor, faça login novamente.', {
            code: 'TOKEN_EXPIRED',
            ...options,
        });
    }
}

/**
 * Token reuse detected - security breach
 */
export class TokenReuseException extends UnauthorizedException {
    constructor(options?: Partial<Omit<HttpExceptionOptions, 'code'>>) {
        super('Sessão invalidada por segurança. Por favor, faça login novamente.', {
            code: 'TOKEN_REUSE_DETECTED',
            ...options,
        });
    }
}

// ============================================================================
// Registration Exceptions
// ============================================================================

export class RegistrationFailedException extends BadRequestException {
    constructor(options?: Partial<Omit<HttpExceptionOptions, 'code'>>) {
        super('Não foi possível criar a conta. Por favor, tente novamente.', {
            code: 'REGISTRATION_FAILED',
            ...options,
        });
    }
}

// ============================================================================
// Authorization Exceptions
// ============================================================================

export class InsufficientPermissionsException extends ForbiddenException {
    constructor(options?: Partial<Omit<HttpExceptionOptions, 'code'>>) {
        super('Você não tem permissão para realizar esta ação.', {
            code: 'INSUFFICIENT_PERMISSIONS',
            ...options,
        });
    }
}

export class AuthenticationRequiredException extends UnauthorizedException {
    constructor(options?: Partial<Omit<HttpExceptionOptions, 'code'>>) {
        super('Por favor, faça login para continuar.', {
            code: 'AUTHENTICATION_REQUIRED',
            ...options,
        });
    }
}
