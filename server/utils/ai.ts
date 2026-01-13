/**
 * AI Utility Functions
 * 
 * Centralized Google Generative AI configuration.
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';

/**
 * Get configured Google Generative AI instance
 * @throws Error if GOOGLE_API_KEY is not configured
 */
export function getGoogleAI() {
    const apiKey = process.env.NUXT_GOOGLE_API_KEY ?? process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        throw new Error('GOOGLE_API_KEY is not configured');
    }

    return createGoogleGenerativeAI({ apiKey });
}
