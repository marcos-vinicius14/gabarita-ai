/**
 * Judge Service - Semantic answer evaluation
 */

import { embed, generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { JudgeResult } from '~/types/study';
import { JUDGE_SYSTEM_PROMPT, buildJudgePrompt } from './prompts';

const SIMILARITY_THRESHOLD_CORRECT = 0.85;
const SIMILARITY_THRESHOLD_INCORRECT = 0.60;

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
}

async function generateEmbedding(text: string): Promise<number[]> {
    const googleApiKey = process.env.NUXT_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;

    if (!googleApiKey) {
        throw new Error('GOOGLE_API_KEY is not configured');
    }

    const google = createGoogleGenerativeAI({
        apiKey: googleApiKey,
    });

    const { embedding } = await embed({
        model: google.textEmbeddingModel('gemini-embedding-001', {
            outputDimensionality: 768,
        }),
        value: text,
    });

    return embedding;
}

async function verifyWithLlm(
    userAnswer: string,
    correctAnswer: string
): Promise<{ isCorrect: boolean; feedback: string }> {
    const googleApiKey = process.env.NUXT_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;

    if (!googleApiKey) {
        throw new Error('GOOGLE_API_KEY is not configured');
    }

    const google = createGoogleGenerativeAI({
        apiKey: googleApiKey,
    });

    const result = await generateText({
        model: google('gemini-2.5-flash'),
        system: JUDGE_SYSTEM_PROMPT,
        prompt: buildJudgePrompt(correctAnswer, userAnswer),
        temperature: 0.3,
        maxTokens: 300,
    });

    try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return { isCorrect: false, feedback: 'Não foi possível avaliar a resposta.' };
        }

        const parsed = JSON.parse(jsonMatch[0]) as { correct: boolean; feedback: string };
        return {
            isCorrect: parsed.correct,
            feedback: parsed.feedback,
        };
    } catch {
        return { isCorrect: false, feedback: 'Não foi possível avaliar a resposta.' };
    }
}

export async function evaluateAnswer(
    userAnswer: string,
    correctAnswer: string,
    cardEmbedding?: number[] | null
): Promise<JudgeResult> {
    const normalizedUserAnswer = userAnswer.trim();
    const normalizedCorrectAnswer = correctAnswer.trim();

    if (!normalizedUserAnswer) {
        return {
            isCorrect: false,
            feedback: 'Você não digitou uma resposta.',
            suggestedRating: 1,
        };
    }

    if (normalizedUserAnswer.toLowerCase() === normalizedCorrectAnswer.toLowerCase()) {
        return {
            isCorrect: true,
            feedback: '✓ Resposta exata!',
            suggestedRating: 4,
            similarity: 1.0,
        };
    }

    const userEmbedding = await generateEmbedding(normalizedUserAnswer);
    const correctEmbedding = cardEmbedding ?? await generateEmbedding(normalizedCorrectAnswer);
    const similarity = cosineSimilarity(userEmbedding, correctEmbedding);

    console.log(`[Judge] Similarity: ${similarity.toFixed(4)}`);

    if (similarity > SIMILARITY_THRESHOLD_CORRECT) {
        return {
            isCorrect: true,
            feedback: '✓ Correto! Sua resposta captura os pontos essenciais.',
            suggestedRating: 3,
            similarity,
        };
    }

    if (similarity < SIMILARITY_THRESHOLD_INCORRECT) {
        return {
            isCorrect: false,
            feedback: '✗ Incorreto. Sua resposta não corresponde ao conteúdo esperado.',
            suggestedRating: 1,
            similarity,
        };
    }

    console.log('[Judge] Gray zone - calling LLM for verification...');
    const llmResult = await verifyWithLlm(normalizedUserAnswer, normalizedCorrectAnswer);

    return {
        isCorrect: llmResult.isCorrect,
        feedback: llmResult.feedback,
        suggestedRating: llmResult.isCorrect ? 2 : 1,
        similarity,
    };
}
