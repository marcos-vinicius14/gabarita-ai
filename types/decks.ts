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
    r2Key?: string | null;
    errorMessage?: string | null;
    cardCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CardItem {
    id: string;
    deckId: string;
    front: string;
    back: string;
    createdAt: string;
}

export interface DeckWithCards extends DeckItem {
    dueCardCount: number;
    cards: CardItem[];
    nextReviewDate?: string | null;
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
export type DeckDetailResponse = ApiResponse<{ deck: DeckWithCards }>;
export type CreateDeckResponse = ApiResponse<{ deck: DeckItem }>;
export type UploadDeckResponse = ApiResponse<{ deck: DeckItem; jobId: string }>;
export type DeleteDeckResponse = ApiResponse<undefined>;
export type UpdateCardResponse = ApiResponse<{ card: CardItem }>;
export type DeleteCardResponse = ApiResponse<undefined>;

// =============================================================================
// Input Types
// =============================================================================

export interface CreateDeckInput {
    topic: string;
}

export interface UploadDeckInput {
    file: File;
    bankStyle?: 'general' | 'cebraspe' | 'fgv';
}

export interface UpdateCardInput {
    front?: string;
    back?: string;
}

// =============================================================================
// Bank Style Options
// =============================================================================

export const BANK_STYLE_OPTIONS = [
    { value: 'general', label: 'Geral' },
    { value: 'cebraspe', label: 'Cebraspe' },
    { value: 'fgv', label: 'FGV' },
] as const;

// =============================================================================
// Helper Type Guards
// =============================================================================

export function isSuccess<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
    return response.success === true;
}

export function isError<T>(response: ApiResponse<T>): response is ErrorResponse {
    return response.success === false;
}

