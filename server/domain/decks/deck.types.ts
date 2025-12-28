/**
 * Deck Types
 * 
 * Type definitions for the Deck domain.
 */

import { z } from 'zod';
import type { InferSelectModel } from 'drizzle-orm';
import type { decks } from '~/server/db/tables/decks';

// ============================================================================
// Database Types
// ============================================================================

export type Deck = InferSelectModel<typeof decks>;

export interface DeckWithCardCount extends Deck {
    cardCount: number;
}

export type DeckStatus = 'processing' | 'ready' | 'failed';
export type DeckSourceType = 'topic' | 'pdf_upload';

// ============================================================================
// Input Schemas (Zod Validation)
// ============================================================================

export const createDeckSchema = z.object({
    topic: z
        .string()
        .min(3, 'O tema deve ter pelo menos 3 caracteres.')
        .max(100, 'O tema deve ter no máximo 100 caracteres.')
        .trim(),
});

export type CreateDeckInput = z.infer<typeof createDeckSchema>;

/**
 * Schema for PDF upload validation
 * Note: Actual file validation is done at upload time with busboy
 */
export const uploadDeckSchema = z.object({
    filename: z
        .string()
        .min(1, 'Nome do arquivo é obrigatório.')
        .max(255, 'Nome do arquivo muito longo.')
        .regex(/\.pdf$/i, 'Apenas arquivos PDF são permitidos.'),
});

export type UploadDeckInput = z.infer<typeof uploadDeckSchema>;

/**
 * Input for updating deck status after processing
 */
export interface UpdateDeckStatusInput {
    deckId: string;
    status: DeckStatus;
    errorMessage?: string;
}

/**
 * Input for creating a deck from PDF upload
 */
export interface CreateUploadDeckInput {
    userId: string;
    filename: string;
    r2Key: string;
}

// ============================================================================
// Service Result Types
// ============================================================================

export interface DeckListResult {
    decks: DeckWithCardCount[];
}

export interface CreateDeckResult {
    deck: Deck;
}

export interface UploadDeckResult {
    deck: Deck;
    jobId: string;
}

// ============================================================================
// Constants
// ============================================================================

export const DECK_LIMITS = {
    free: 3,
    trial: 10,
    pro: 100,
    admin: Infinity,
} as const;

export type UserRole = keyof typeof DECK_LIMITS;

/**
 * Maximum file size for PDF uploads (50MB)
 */
export const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Allowed MIME types for PDF uploads
 */
export const ALLOWED_PDF_MIME_TYPES = [
    'application/pdf',
] as const;

