/**
 * Deck Generation Task (Graphile Worker)
 *
 * Processes uploaded PDFs:
 * 1. Downloads from R2 (with gunzip decompression)
 * 2. Extracts text using pdfjs-dist with parallel Worker Threads
 * 3. Generates flashcards using AI (Gemini)
 * 4. Batch inserts cards into PostgreSQL
 * 5. Updates deck status
 */

import type { Task, JobHelpers } from 'graphile-worker';
import { generateText, embed } from 'ai';
import { createHash } from 'crypto';
import { getGoogleAI } from '../utils/ai';
import { db } from '../utils/db';
import { cards } from '../db/tables/cards';
import { downloadStreamFromR2, deleteFromR2 } from '../utils/storage';
import { updateDeckStatus, getDeckById } from '../domain/decks/deck.repository';
import { publishDeckStatus, closePublisher } from '../utils/pubsub';
import { getOrSet } from '../utils/cache.service';
import { extractTextFromPdf } from '../services/pdf-extractor.service';
import type { DeckGenerationJobData } from '../utils/queue';

interface GeneratedCard {
    front: string;
    back: string;
}

interface ErrorPattern {
    match: (message: string) => boolean;
    response: string;
}

const errorPatterns: ErrorPattern[] = [
    {
        match: (msg) => msg.includes('pdf does not contain enough text'),
        response: 'O PDF não contém texto suficiente para gerar flashcards. Tente um documento com mais conteúdo.',
    },
    {
        match: (msg) => msg.includes('no flashcards could be generated'),
        response: 'Não foi possível gerar flashcards a partir deste PDF. O conteúdo pode não ser adequado para estudo.',
    },
    {
        match: (msg) => msg.includes('failed to parse ai response'),
        response: 'A IA não conseguiu processar o documento corretamente. Por favor, tente novamente.',
    },
    {
        match: (msg) => msg.includes('api key') || msg.includes('not configured'),
        response: 'Erro de configuração do servidor. Entre em contato com o suporte.',
    },
    {
        match: (msg) => ['r2', 'storage', 'download'].some(term => msg.includes(term)),
        response: 'Erro ao acessar o arquivo. Por favor, tente fazer o upload novamente.',
    },
    {
        match: (msg) => msg.includes('timeout') || msg.includes('timed out'),
        response: 'O processamento demorou muito. Tente com um PDF menor.',
    },
];

const DEFAULT_ERROR_MESSAGE = 'Ocorreu um erro ao processar o PDF. Por favor, tente novamente.';

function getUserFriendlyErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();
    const matched = errorPatterns.find(pattern => pattern.match(message));
    return matched?.response ?? DEFAULT_ERROR_MESSAGE;
}

/**
 * Convert a readable stream to ArrayBuffer for PDF processing
 */
async function streamToArrayBuffer(stream: NodeJS.ReadableStream): Promise<ArrayBuffer> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk as Uint8Array);
    }
    return Buffer.concat(chunks).buffer;
}

async function generateFlashcardsFromText(
    text: string,
    topic: string,
    maxCards: number = 20,
    logger: JobHelpers['logger']
): Promise<GeneratedCard[]> {
    const contentHash = createHash('sha256')
        .update(text.substring(0, 1000) + topic + maxCards)
        .digest('hex')
        .substring(0, 16);
    const cacheKey = `ai:flashcards:${contentHash}`;

    return getOrSet(cacheKey, async () => {
        const google = getGoogleAI();

        const prompt = `Você é um especialista em criar flashcards de estudo eficazes.

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
${text.substring(0, 15000)}
---

Retorne APENAS um array JSON válido com os flashcards no formato:
[{"front": "pergunta", "back": "resposta"}, ...]

Não inclua explicações, markdown ou código, apenas o JSON puro.`;

        const result = await generateText({
            model: google('gemini-2.5-flash'),
            prompt,
            temperature: 0.7,
            maxTokens: 4000,
        });

        let jsonText = result.text.trim();

        logger.debug(`Raw AI response length: ${jsonText.length}`);

        const extractFromCodeBlock = (text: string): string => {
            const completeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (completeMatch) {
                logger.debug('Extracted from complete code block');
                return completeMatch[1].trim();
            }

            const incompleteMatch = text.match(/```(?:json)?\s*([\s\S]*)/);
            if (incompleteMatch) {
                logger.debug('Extracted from incomplete code block (truncated response)');
                return incompleteMatch[1].trim();
            }

            return text;
        };

        jsonText = extractFromCodeBlock(jsonText);

        const extractJsonArray = (text: string): string | null => {
            const completeMatch = text.match(/\[[\s\S]*\]/);
            if (completeMatch) return completeMatch[0];

            const arrayStart = text.indexOf('[');
            if (arrayStart === -1) return null;

            const partialArray = text.substring(arrayStart);
            const lastCompleteObject = partialArray.lastIndexOf('}');
            if (lastCompleteObject === -1) return null;

            logger.debug('Reconstructed array from partial response');
            return partialArray.substring(0, lastCompleteObject + 1) + ']';
        };

        const jsonArray = extractJsonArray(jsonText);

        if (!jsonArray) {
            logger.error(`No JSON array found in response: ${jsonText.substring(0, 1000)}`);
            throw new Error('Failed to parse AI response as JSON - no array found');
        }

        const parseFlashcards = (json: string): GeneratedCard[] => {
            const parsed = JSON.parse(json);
            if (!Array.isArray(parsed)) {
                throw new Error('AI response is not an array');
            }
            return parsed;
        };

        const flashcards = (() => {
            try {
                return parseFlashcards(jsonArray);
            } catch (parseError) {
                logger.error(`JSON parse error: ${parseError}`);
                throw new Error('Failed to parse AI response as JSON - invalid JSON syntax');
            }
        })();

        logger.info(`Successfully parsed ${flashcards.length} flashcards from AI`);

        // Validate card structure using filter
        const isValidCard = (card: GeneratedCard): boolean =>
            typeof card.front === 'string' &&
            typeof card.back === 'string' &&
            card.front.trim().length > 0 &&
            card.back.trim().length > 0;

        return flashcards.filter(isValidCard);
    }, 600); // 10 minutes TTL for AI responses
}

/**
 * Generate embedding for text using Gemini embedding model
 * Uses Matryoshka representation with 768 dimensions to match schema
 */
async function generateEmbedding(text: string): Promise<number[]> {
    const google = getGoogleAI();

    const { embedding } = await embed({
        model: google.textEmbeddingModel('gemini-embedding-001', {
            outputDimensionality: 768,
        }),
        value: text,
    });

    return embedding;
}

async function insertCards(deckId: string, generatedCards: GeneratedCard[], logger: JobHelpers['logger']) {
    if (generatedCards.length === 0) {
        return 0;
    }

    logger.info(`Generating embeddings for ${generatedCards.length} cards...`);

    const cardValues = await Promise.all(
        generatedCards.map(async (card) => {
            const backText = card.back.trim();
            const embedding = await generateEmbedding(backText);

            return {
                deckId,
                front: card.front.trim(),
                back: backText,
                embedding,
            };
        })
    );

    logger.info('Successfully generated embeddings');

    await (db as any).insert(cards).values(cardValues);

    return cardValues.length;
}


const task: Task = async (payload, helpers) => {
    const { deckId, userId, r2Key, originalFilename } = payload as DeckGenerationJobData;
    const { logger, job } = helpers;

    logger.info(`Processing job ${job.id} for deck ${deckId}`);

    try {
        const deck = await getDeckById(deckId);
        if (!deck) {
            logger.warn(`Deck ${deckId} not found, skipping`);
            return;
        }

        logger.info(`Downloading from R2: ${r2Key}`);
        await publishDeckStatus(deckId, userId, 'processing', { progress: 'Baixando arquivo...' });

        const pdfStream = await downloadStreamFromR2(r2Key);
        const pdfArrayBuffer = await streamToArrayBuffer(pdfStream);
        logger.info(`Downloaded ${pdfArrayBuffer.byteLength} bytes`);

        // Extract text with progress reporting
        const text = await extractTextFromPdf(pdfArrayBuffer, {
            onProgress: (progress) => {
                if (progress.phase === 'extracting') {
                    publishDeckStatus(deckId, userId, 'processing', {
                        progress: `Extraindo página ${progress.currentPage}/${progress.totalPages}...`
                    });
                }
            }
        });

        logger.info(`Extracted ${text.length} characters`);

        if (text.trim().length < 100) {
            throw new Error('PDF does not contain enough text for card generation');
        }

        logger.info('Generating flashcards with AI');
        await publishDeckStatus(deckId, userId, 'processing', { progress: 'Gerando flashcards com IA...' });

        const flashcards = await generateFlashcardsFromText(
            text,
            deck.topic,
            30,
            logger
        );
        logger.info(`Generated ${flashcards.length} flashcards`);

        if (flashcards.length === 0) {
            throw new Error('No flashcards could be generated from the PDF');
        }

        logger.info('Inserting cards into database');
        await publishDeckStatus(deckId, userId, 'processing', { progress: 'Salvando flashcards...' });

        const insertedCount = await insertCards(deckId, flashcards, logger);
        logger.info(`Inserted ${insertedCount} cards`);

        await updateDeckStatus(deckId, 'ready');
        await publishDeckStatus(deckId, userId, 'ready');
        logger.info(`Deck ${deckId} marked as ready`);

        await deleteFromR2(r2Key);
        logger.info(`Deleted ${r2Key} from R2`);

    } catch (error: any) {
        logger.error(`Job ${job.id} failed: ${error.message}`);

        const userMessage = getUserFriendlyErrorMessage(error);
        await updateDeckStatus(deckId, 'failed', userMessage);
        await publishDeckStatus(deckId, userId, 'failed', { errorMessage: userMessage });

        throw error;
    }
};

export default task;
