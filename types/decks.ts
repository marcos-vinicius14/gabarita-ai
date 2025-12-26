/**
 * Deck API Types (Discriminated Unions)
 * 
 * Type-safe API responses for deck operations.
 * Consistent with the auth types pattern.
 */

// =============================================================================
// Deck Types (Frontend)
// =============================================================================

export interface DeckItem {
    id: string;
    userId: string;
    topic: string;
    sourceType: 'topic' | 'pdf_upload';
    status: 'processing' | 'ready' | 'failed';
    cardCount: number;
    createdAt: string;
    updatedAt: string;
}

// =============================================================================
// API Response Types (Discriminated Unions)
// =============================================================================

interface SuccessResponse<T> {
    success: true;
    message: string;
    data: T;
}

interface ErrorResponse {
    success: false;
    message: string;
    code?: string;
    errors?: Record<string, string[]>;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// =============================================================================
// Deck-specific Response Types
// =============================================================================

export type DeckListResponse = ApiResponse<{ decks: DeckItem[] }>;
export type CreateDeckResponse = ApiResponse<{ deck: DeckItem }>;
export type DeleteDeckResponse = ApiResponse<undefined>;

// =============================================================================
// Input Types
// =============================================================================

export interface CreateDeckInput {
    topic: string;
}

// =============================================================================
// Helper Type Guards
// =============================================================================

export function isSuccess<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
    return response.success === true;
}

export function isError<T>(response: ApiResponse<T>): response is ErrorResponse {
    return response.success === false;
}
