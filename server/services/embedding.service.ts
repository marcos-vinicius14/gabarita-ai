/**
 * Embedding Service
 *
 * Generates text embeddings using Gemini's embedding model.
 * Optimized for batch operations with a single API call.
 */

import { embedMany } from 'ai';
import { getGoogleAI } from '../utils/ai';

const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_MODEL = 'gemini-embedding-001';


export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const google = getGoogleAI();

    const { embeddings } = await embedMany({
        model: google.textEmbeddingModel(EMBEDDING_MODEL, {
            outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
        values: texts,
    });

    return embeddings;
}

export async function generateEmbedding(text: string): Promise<number[]> {
    const [embedding] = await generateEmbeddingsBatch([text]);
    return embedding;
}
