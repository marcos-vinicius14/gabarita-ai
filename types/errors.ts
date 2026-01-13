/**
 * Common Error Types
 * 
 * Shared error types to replace 'any' in catch blocks and mutation callbacks.
 */

/**
 * Standard error with message property
 */
export interface ErrorWithMessage {
    message: string;
}

/**
 * API error response format
 */
export interface ApiError extends ErrorWithMessage {
    statusCode?: number;
    data?: {
        message?: string;
        code?: string;
        errors?: Array<{ field: string; message: string }>;
    };
}

/**
 * TanStack Mutation error callback type
 */
export type MutationError = Error & {
    data?: {
        message?: string;
        code?: string;
    };
};

/**
 * Type guard to check if an error has a message property
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as Record<string, unknown>).message === 'string'
    );
}

/**
 * Extract message from unknown error
 */
export function getErrorMessage(error: unknown): string {
    if (isErrorWithMessage(error)) return error.message;
    if (typeof error === 'string') return error;
    return 'An unexpected error occurred';
}

/**
 * Extract API error message with fallback
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null) {
        const apiError = error as ApiError;
        return apiError.data?.message ?? apiError.message ?? fallback;
    }
    return fallback;
}
