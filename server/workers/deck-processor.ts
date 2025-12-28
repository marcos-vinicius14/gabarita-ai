/**
 * Deck Processor Worker
 * 
 * BullMQ worker that processes uploaded PDFs:
 * 1. Downloads from R2 (with gunzip decompression)
 * 2. Extracts text using pdf-parse
 * 3. Generates flashcards using AI (Gemini)
 * 4. Batch inserts cards into PostgreSQL
 * 5. Updates deck status
 * 
 * Run this worker separately from the main Nuxt app:
 *   pnpm worker
 */

// Load environment variables first (before any other imports that need them)
import 'dotenv/config';

import { Worker, type Job } from 'bullmq';
import { PDFParse } from 'pdf-parse';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { db } from '../utils/db';
import { cards } from '../db/tables/cards';
import { downloadBufferFromR2, deleteFromR2 } from '../utils/storage';
import { updateDeckStatus, getDeckById } from '../domain/decks/deck.repository';
import { QUEUE_NAMES, type DeckGenerationJobData } from '../utils/queue';

// Redis connection for the worker
function getRedisConnection() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const url = new URL(redisUrl);

    return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        maxRetriesPerRequest: null,
    };
}

/**
 * Interface for generated flashcard
 */
interface GeneratedCard {
    front: string;
    back: string;
}


async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    const pdfParse = new PDFParse({ data: buffer });
    const result = await pdfParse.getText();

    await pdfParse.destroy();

    return result.text;
}


async function generateFlashcardsFromText(
    text: string,
    topic: string,
    maxCards: number = 20
): Promise<GeneratedCard[]> {
    const googleApiKey = process.env.NUXT_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;

    if (!googleApiKey) {
        throw new Error('GOOGLE_API_KEY is not configured');
    }

    const google = createGoogleGenerativeAI({
        apiKey: googleApiKey,
    });

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

Não inclua explicações, apenas o JSON.`;

    const result = await generateText({
        model: google('gemini-2.5-flash'),
        prompt,
        temperature: 0.7,
        maxTokens: 4000,
    });

    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        console.error('[Worker] Failed to parse AI response:', result.text);
        throw new Error('Failed to parse AI response as JSON');
    }

    const flashcards = JSON.parse(jsonMatch[0]) as GeneratedCard[];

    if (!Array.isArray(flashcards)) {
        throw new Error('AI response is not an array');
    }

    return flashcards.filter(card =>
        typeof card.front === 'string' &&
        typeof card.back === 'string' &&
        card.front.trim().length > 0 &&
        card.back.trim().length > 0
    );
}

async function insertCards(deckId: string, generatedCards: GeneratedCard[]) {
    if (generatedCards.length === 0) {
        return 0;
    }

    const cardValues = generatedCards.map(card => ({
        deckId,
        front: card.front.trim(),
        back: card.back.trim(),
    }));

    await (db as any).insert(cards).values(cardValues);

    return cardValues.length;
}

async function processDeckJob(job: Job<DeckGenerationJobData>): Promise<void> {
    const { deckId, userId, r2Key, originalFilename } = job.data;

    console.log(`[Worker] Processing job ${job.id} for deck ${deckId}`);

    try {
        const deck = await getDeckById(deckId);
        if (!deck) {
            console.warn(`[Worker] Deck ${deckId} not found, skipping`);
            return;
        }

        console.log(`[Worker] Downloading from R2: ${r2Key}`);
        const pdfBuffer = await downloadBufferFromR2(r2Key);
        console.log(`[Worker] Downloaded ${pdfBuffer.length} bytes`);
        console.log(`[Worker] Extracting text from PDF`);
        const text = await extractTextFromPdf(pdfBuffer);
        console.log(`[Worker] Extracted ${text.length} characters`);

        if (text.trim().length < 100) {
            throw new Error('PDF does not contain enough text for card generation');
        }

        console.log(`[Worker] Generating flashcards with AI`);
        const flashcards = await generateFlashcardsFromText(
            text,
            deck.topic,
            30
        );
        console.log(`[Worker] Generated ${flashcards.length} flashcards`);

        if (flashcards.length === 0) {
            throw new Error('No flashcards could be generated from the PDF');
        }

        console.log(`[Worker] Inserting cards into database`);
        const insertedCount = await insertCards(deckId, flashcards);
        console.log(`[Worker] Inserted ${insertedCount} cards`);

        await updateDeckStatus(deckId, 'ready');
        console.log(`[Worker] Deck ${deckId} marked as ready`);

        await deleteFromR2(r2Key);
        console.log(`[Worker] Deleted ${r2Key} from R2`);

    } catch (error: any) {
        console.error(`[Worker] Job ${job.id} failed:`, error);

        await updateDeckStatus(
            deckId,
            'failed',
            error.message || 'Unknown error during processing'
        );

        throw error;
    }
}


function startWorker() {
    console.log('[Worker] Starting deck generation worker...');

    const connection = getRedisConnection();

    const worker = new Worker<DeckGenerationJobData>(
        QUEUE_NAMES.DECK_GENERATION,
        processDeckJob,
        {
            connection,
            concurrency: 2,
        }
    );

    worker.on('completed', (job) => {
        console.log(`[Worker] ✅ Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, error) => {
        console.error(`[Worker] ❌ Job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
        console.error('[Worker] Error:', error);
    });

    process.on('SIGTERM', async () => {
        console.log('[Worker] Received SIGTERM, shutting down...');
        await worker.close();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        console.log('[Worker] Received SIGINT, shutting down...');
        await worker.close();
        process.exit(0);
    });

    console.log(`[Worker] Listening to queue: ${QUEUE_NAMES.DECK_GENERATION}`);
}

startWorker();
