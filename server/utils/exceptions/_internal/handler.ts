/**
 * Exception Handler Utility
 * 
 * Provides consistent error handling across API routes.
 * Catches exceptions and returns properly formatted responses.
 */

import { type H3Event, setResponseStatus } from 'h3';
import { HttpException, InternalServerException } from './http.exception';

interface ErrorResponse {
    success: false;
    message: string;
    code: string;
    timestamp: string;
    errors?: Record<string, string[]>;
    retryAfter?: number;
}

/**
 * Handles exceptions and returns a consistent error response
 * 
 * @param event - H3 event object
 * @param error - The caught error
 * @returns Formatted error response for the client
 * 
 * @example
 * ```ts
 * export default defineEventHandler(async (event) => {
 *     try {
 *         // ... handler logic
 *     } catch (error) {
 *         return handleException(event, error);
 *     }
 * });
 * ```
 */
export function handleException(event: H3Event, error: unknown): ErrorResponse {
    console.error('[API Error]', {
        path: event.path,
        method: event.method,
        error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
        } : error,
    });

    if (error instanceof HttpException) {
        setResponseStatus(event, error.statusCode);
        return error.toJSON() as ErrorResponse;
    }
    const internalError = new InternalServerException(
        'Ocorreu um erro inesperado. Tente novamente.',
        { cause: error instanceof Error ? error : undefined }
    );

    setResponseStatus(event, 500);
    return internalError.toJSON() as ErrorResponse;
}

export function isHttpException(error: unknown): error is HttpException {
    return error instanceof HttpException;
}
