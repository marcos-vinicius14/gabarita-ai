/**
 * Flashcard Generator Service
 *
 * Generates flashcards from text using AI (Gemini).
 * Handles prompt construction, caching, and response parsing.
 */

import { generateText } from 'ai';
import { createHash } from 'crypto';
import { getGoogleAI } from '../utils/ai';
import { getOrSet } from '../utils/cache.service';
import { parseFlashcardsResponse, type Flashcard } from './ai-parser.service';

const CACHE_TTL_SECONDS = 600;
const MAX_TEXT_FOR_AI = 15_000;


const buildPrompt = (text: string, topic: string, maxCards: number): string => `
Você é um especialista em criar flashcards de estudo eficazes.

Com base no seguinte texto extraído de um PDF sobre "${topic}", crie até ${maxCards} flashcards de alta qualidade.

Regras:
1. Cada flashcard deve ter uma pergunta (front) clara e objetiva
2. A resposta (back) deve ser concisa mas completa
3. Foque nos conceitos mais importantes
4. Evite perguntas muito simples ou triviais
5. Use linguagem clara e direta
6. Se o texto estiver em português, crie os flashcards em português

Texto do PDF:
---
${text.substring(0, MAX_TEXT_FOR_AI)}
---

Retorne APENAS um array JSON válido com os flashcards no formato:
[{"front": "pergunta", "back": "resposta"}, ...]

Não inclua explicações, markdown ou código, apenas o JSON puro.
`.trim();

const generateCacheKey = (text: string, topic: string, maxCards: number): string => {
    const hash = createHash('sha256')
        .update(text.substring(0, 1000) + topic + maxCards)
        .digest('hex')
        .substring(0, 16);
    return `ai:flashcards:${hash}`;
};

export interface GenerateFlashcardsOptions {
    topic: string;
    maxCards?: number;
    onProgress?: (message: string) => void;
}

export async function generateFlashcards(
    text: string,
    options: GenerateFlashcardsOptions
): Promise<Flashcard[]> {
    const { topic, maxCards = 30 } = options;
    const cacheKey = generateCacheKey(text, topic, maxCards);

    return getOrSet(cacheKey, async () => {
        const google = getGoogleAI();
        const prompt = buildPrompt(text, topic, maxCards);

        const result = await generateText({
            model: google('gemini-2.5-flash'),
            prompt,
            temperature: 0.7,
            maxTokens: 4000,
        });

        const { flashcards } = parseFlashcardsResponse(result.text);
        return flashcards;
    }, CACHE_TTL_SECONDS);
}
