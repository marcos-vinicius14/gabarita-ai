/**
 * AI Response Parser Service
 * 
 * Responsible for parsing and validating AI-generated flashcard responses.
 * Handles edge cases like truncated responses, code blocks, and invalid JSON.
 */

import { z } from 'zod';


export const FlashcardSchema = z.object({
    front: z.string().min(1).transform(s => s.trim()),
    back: z.string().min(1).transform(s => s.trim()),
});

export const FlashcardsArraySchema = z.array(FlashcardSchema);

export type Flashcard = z.infer<typeof FlashcardSchema>;

function extractFromCodeBlock(text: string): string {
    const completeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (completeMatch) return completeMatch[1].trim();

    const incompleteMatch = text.match(/```(?:json)?\s*([\s\S]*)/);
    if (incompleteMatch) return incompleteMatch[1].trim();

    return text;
}

function extractJsonArray(text: string): string | null {
    const completeMatch = text.match(/\[[\s\S]*\]/);
    if (completeMatch) return completeMatch[0];

    const arrayStart = text.indexOf('[');
    if (arrayStart === -1) return null;

    const partialArray = text.substring(arrayStart);
    const lastCompleteObject = partialArray.lastIndexOf('}');
    if (lastCompleteObject === -1) return null;

    return partialArray.substring(0, lastCompleteObject + 1) + ']';
}

export interface ParseResult {
    flashcards: Flashcard[];
    rawLength: number;
    wasReconstructed: boolean;
}

/**
 * Parse AI response text into validated flashcards
 * 
 * @throws Error if no valid flashcards can be extracted
 */
export function parseFlashcardsResponse(rawText: string): ParseResult {
    const text = rawText.trim();
    const rawLength = text.length;

    const withoutCodeBlock = extractFromCodeBlock(text);

    const jsonArray = extractJsonArray(withoutCodeBlock);

    if (!jsonArray) {
        throw new Error('No JSON array found in AI response');
    }

    const wasReconstructed = !text.match(/\[[\s\S]*\]/);

    const parsed = JSON.parse(jsonArray);
    const result = FlashcardsArraySchema.safeParse(parsed);

    if (!result.success) {
        throw new Error(`Invalid flashcard structure: ${result.error.message}`);
    }

    const validFlashcards = result.data.filter(
        card => card.front.length > 0 && card.back.length > 0
    );

    if (validFlashcards.length === 0) {
        throw new Error('No valid flashcards found in AI response');
    }

    return {
        flashcards: validFlashcards,
        rawLength,
        wasReconstructed,
    };
}
