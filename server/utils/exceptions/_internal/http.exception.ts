/**
 * HTTP Exception Base class
 * 
 * Provides a structured way to throw HTTP errors with:
 * - User-friendly messages
 * - Internal error codes for debugging
 * - Proper HTTP status codes
 */

export interface HttpExceptionOptions {
    code: string;
    details?: Record<string, unknown>;
    cause?: Error;
}

/**
 * Base HTTP Exception
 * All custom exceptions should extend this class
 */
export class HttpException extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: Record<string, unknown>;
    public readonly timestamp: string;

    constructor(
        message: string,
        statusCode: number,
        options: HttpExceptionOptions
    ) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = options.code;
        this.details = options.details;
        this.timestamp = new Date().toISOString();

        if (options.cause) {
            this.cause = options.cause;
        }

        Error.captureStackTrace?.(this, this.constructor);
    }

    toJSON() {
        return {
            success: false,
            message: this.message,
            code: this.code,
            timestamp: this.timestamp,
        };
    }
}


// ============================================================================
// 4xx Client Errors
// ============================================================================

export class BadRequestException extends HttpException {
    constructor(message: string, options?: Partial<HttpExceptionOptions>) {
        super(message, 400, {
            code: options?.code ?? 'BAD_REQUEST',
            details: options?.details,
            cause: options?.cause,
        });
    }
}

/**
 * 401 Unauthorized
 * Use when authentication is required but not provided/valid
 */
export class UnauthorizedException extends HttpException {
    constructor(message: string, options?: Partial<HttpExceptionOptions>) {
        super(message, 401, {
            code: options?.code ?? 'UNAUTHORIZED',
            details: options?.details,
            cause: options?.cause,
        });
    }
}

/**
 * 403 Forbidden
 * Use when user is authenticated but lacks permission
 */
export class ForbiddenException extends HttpException {
    constructor(message: string, options?: Partial<HttpExceptionOptions>) {
        super(message, 403, {
            code: options?.code ?? 'FORBIDDEN',
            details: options?.details,
            cause: options?.cause,
        });
    }
}

/**
 * 404 Not Found
 * Use when requested resource doesn't exist
 */
export class NotFoundException extends HttpException {
    constructor(message: string, options?: Partial<HttpExceptionOptions>) {
        super(message, 404, {
            code: options?.code ?? 'NOT_FOUND',
            details: options?.details,
            cause: options?.cause,
        });
    }
}

/**
 * 409 Conflict
 * Use when there's a conflict with current state (e.g., duplicate email)
 */
export class ConflictException extends HttpException {
    constructor(message: string, options?: Partial<HttpExceptionOptions>) {
        super(message, 409, {
            code: options?.code ?? 'CONFLICT',
            details: options?.details,
            cause: options?.cause,
        });
    }
}

/**
 * 422 Unprocessable Entity
 * Use when validation fails
 */
export class ValidationException extends HttpException {
    public readonly errors: Record<string, string[]>;

    constructor(
        message: string,
        errors: Record<string, string[]> = {},
        options?: Partial<HttpExceptionOptions>
    ) {
        super(message, 422, {
            code: options?.code ?? 'VALIDATION_ERROR',
            details: { ...options?.details, errors },
            cause: options?.cause,
        });
        this.errors = errors;
    }

    override toJSON() {
        return {
            ...super.toJSON(),
            errors: this.errors,
        };
    }
}

/**
 * 429 Too Many Requests
 * Use when rate limit is exceeded
 */
export class TooManyRequestsException extends HttpException {
    public readonly retryAfter: number;

    constructor(
        message: string,
        retryAfterSeconds: number,
        options?: Partial<HttpExceptionOptions>
    ) {
        super(message, 429, {
            code: options?.code ?? 'RATE_LIMITED',
            details: { ...options?.details, retryAfterSeconds },
            cause: options?.cause,
        });
        this.retryAfter = retryAfterSeconds;
    }

    override toJSON() {
        return {
            ...super.toJSON(),
            retryAfter: this.retryAfter,
        };
    }
}

// ============================================================================
// 5xx Server Errors
// ============================================================================

/**
 * 500 Internal Server Error
 * Use for unexpected server errors
 */
export class InternalServerException extends HttpException {
    constructor(
        message: string = 'Ocorreu um erro inesperado. Tente novamente.',
        options?: Partial<HttpExceptionOptions>
    ) {
        super(message, 500, {
            code: options?.code ?? 'INTERNAL_ERROR',
            details: options?.details,
            cause: options?.cause,
        });
    }
}

/**
 * 503 Service Unavailable
 * Use when a dependent service is unavailable
 */
export class ServiceUnavailableException extends HttpException {
    constructor(
        message: string = 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.',
        options?: Partial<HttpExceptionOptions>
    ) {
        super(message, 503, {
            code: options?.code ?? 'SERVICE_UNAVAILABLE',
            details: options?.details,
            cause: options?.cause,
        });
    }
}
