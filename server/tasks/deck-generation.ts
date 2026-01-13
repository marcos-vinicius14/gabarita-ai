/**
 * Deck Generation Task (Graphile Worker)
 *
 * Processes uploaded PDFs through a simple pipeline:
 * 1. Download PDF from R2
 * 2. Extract text from PDF
 * 3. Generate flashcards with AI
 * 4. Generate embeddings and save to database
 */

import type { Task, JobHelpers } from 'graphile-worker';
import { db } from '../utils/db';
import { cards } from '../db/tables/cards';
import { downloadStreamFromR2, deleteFromR2 } from '../utils/storage';
import { updateDeckStatus, getDeckById } from '../domain/decks/deck.repository';
import { publishDeckStatus } from '../utils/pubsub';
import { extractTextFromPdf } from '../services/pdf-extractor.service';
import { generateFlashcards, type Flashcard } from '../services/flashcard-generator.service';
import { generateEmbeddingsBatch } from '../services/embedding.service';
import type { DeckGenerationJobData } from '../utils/queue';

// ============================================================================
// Error Handling
// ============================================================================

const ERROR_MESSAGES: Record<string, string> = {
    'pdf does not contain enough text': 'O PDF não contém texto suficiente para gerar flashcards.',
    'no flashcards could be generated': 'Não foi possível gerar flashcards a partir deste PDF.',
    'no json array found': 'A IA não conseguiu processar o documento. Tente novamente.',
    'api key': 'Erro de configuração do servidor. Entre em contato com o suporte.',
    'r2': 'Erro ao acessar o arquivo. Tente fazer o upload novamente.',
    'storage': 'Erro ao acessar o arquivo. Tente fazer o upload novamente.',
    'timeout': 'O processamento demorou muito. Tente com um PDF menor.',
};

const DEFAULT_ERROR = 'Ocorreu um erro ao processar o PDF. Tente novamente.';

const getErrorMessage = (error: Error): string => {
    const msg = error.message.toLowerCase();
    const match = Object.entries(ERROR_MESSAGES).find(([key]) => msg.includes(key));
    return match?.[1] ?? DEFAULT_ERROR;
};

// ============================================================================
// Helpers
// ============================================================================

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<ArrayBuffer> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk as Uint8Array);
    }
    return Buffer.concat(chunks).buffer;
}

type ProgressFn = (message: string, percent?: number) => Promise<void>;

const createProgressReporter = (deckId: string, userId: string): ProgressFn => {
    return async (message: string, percent?: number) => {
        const progress = percent ? `[${percent}%] ${message}` : message;
        await publishDeckStatus(deckId, userId, 'processing', { progress });
    };
};

// ============================================================================
// Card Insertion
// ============================================================================

async function insertCardsWithEmbeddings(
    deckId: string,
    flashcards: Flashcard[],
    logger: JobHelpers['logger']
): Promise<number> {
    if (flashcards.length === 0) return 0;

    logger.info(`Generating embeddings for ${flashcards.length} cards (batch)...`);

    const texts = flashcards.map(card => card.back);
    const embeddings = await generateEmbeddingsBatch(texts);

    logger.info('Embeddings generated successfully');

    const cardValues = flashcards.map((card, i) => ({
        deckId,
        front: card.front,
        back: card.back,
        embedding: embeddings[i],
    }));

    await (db as any).insert(cards).values(cardValues);
    return cardValues.length;
}

// ============================================================================
// Main Task
// ============================================================================

const task: Task = async (payload, helpers) => {
    const { deckId, userId, r2Key } = payload as DeckGenerationJobData;
    const { logger, job } = helpers;
    const report = createProgressReporter(deckId, userId);

    logger.info(`Processing job ${job.id} for deck ${deckId}`);

    try {
        // Step 1: Validate deck exists
        const deck = await getDeckById(deckId);
        if (!deck) {
            logger.warn(`Deck ${deckId} not found, skipping`);
            return;
        }

        // Step 2: Download PDF
        await report('Baixando arquivo...');
        const pdfStream = await downloadStreamFromR2(r2Key);
        const pdfBuffer = await streamToBuffer(pdfStream);
        logger.info(`Downloaded ${pdfBuffer.byteLength} bytes`);

        // Step 3: Extract text
        const text = await extractTextFromPdf(pdfBuffer, {
            onProgress: (p) => {
                if (p.phase === 'extracting') {
                    const percent = Math.round((p.currentPage / p.totalPages) * 30);
                    report(`Extraindo página ${p.currentPage}/${p.totalPages}...`, percent);
                }
            }
        });
        logger.info(`Extracted ${text.length} characters`);

        if (text.trim().length < 100) {
            throw new Error('PDF does not contain enough text for card generation');
        }

        // Step 4: Generate flashcards
        await report('Gerando flashcards com IA...', 40);
        const flashcards = await generateFlashcards(text, { topic: deck.topic });
        logger.info(`Generated ${flashcards.length} flashcards`);

        if (flashcards.length === 0) {
            throw new Error('No flashcards could be generated from the PDF');
        }

        // Step 5: Save to database
        await report('Gerando embeddings e salvando...', 70);
        const count = await insertCardsWithEmbeddings(deckId, flashcards, logger);
        logger.info(`Inserted ${count} cards`);

        // Step 6: Mark as ready
        await updateDeckStatus(deckId, 'ready');
        await publishDeckStatus(deckId, userId, 'ready');
        logger.info(`Deck ${deckId} marked as ready`);

        // Step 7: Cleanup
        await deleteFromR2(r2Key);
        logger.info(`Deleted ${r2Key} from R2`);

    } catch (error: any) {
        logger.error(`Job ${job.id} failed: ${error.message}`);

        const userMessage = getErrorMessage(error);
        await updateDeckStatus(deckId, 'failed', userMessage);
        await publishDeckStatus(deckId, userId, 'failed', { errorMessage: userMessage });

        throw error;
    }
};

export default task;
