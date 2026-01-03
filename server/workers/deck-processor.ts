/**
 * Deck Processor Worker
 *
 * pg-boss worker that processes uploaded PDFs:
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

import { PgBoss } from 'pg-boss';
import { PDFParse } from 'pdf-parse';
import { generateText, embed } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { db } from '../utils/db';
import { cards } from '../db/tables/cards';
import { downloadBufferFromR2, deleteFromR2 } from '../utils/storage';
import { updateDeckStatus, getDeckById } from '../domain/decks/deck.repository';
import { QUEUE_NAMES, type DeckGenerationJobData } from '../utils/queue';
import { publishDeckStatus, closePublisher } from '../utils/pubsub';


interface GeneratedCard {
    front: string;
    back: string;
}


interface PgBossJob<T> {
    id: string;
    name: string;
    data: T;
}


function getUserFriendlyErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('pdf does not contain enough text')) {
        return 'O PDF não contém texto suficiente para gerar flashcards. Tente um documento com mais conteúdo.';
    }

    if (message.includes('no flashcards could be generated')) {
        return 'Não foi possível gerar flashcards a partir deste PDF. O conteúdo pode não ser adequado para estudo.';
    }

    if (message.includes('failed to parse ai response')) {
        return 'A IA não conseguiu processar o documento corretamente. Por favor, tente novamente.';
    }

    if (message.includes('api key') || message.includes('not configured')) {
        return 'Erro de configuração do servidor. Entre em contato com o suporte.';
    }

    if (message.includes('r2') || message.includes('storage') || message.includes('download')) {
        return 'Erro ao acessar o arquivo. Por favor, tente fazer o upload novamente.';
    }

    if (message.includes('timeout') || message.includes('timed out')) {
        return 'O processamento demorou muito. Tente com um PDF menor.';
    }

    return 'Ocorreu um erro ao processar o PDF. Por favor, tente novamente.';
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

Não inclua explicações, markdown ou código, apenas o JSON puro.`;

    const result = await generateText({
        model: google('gemini-2.5-flash'),
        prompt,
        temperature: 0.7,
        maxTokens: 4000,
    });

    let jsonText = result.text.trim();

    console.log('[Worker] Raw AI response length:', jsonText.length);
    console.log('[Worker] Raw AI response preview:', jsonText.substring(0, 500));

    const completeCodeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (completeCodeBlockMatch) {
        jsonText = completeCodeBlockMatch[1].trim();
        console.log('[Worker] Extracted from complete code block');
    } else {
        const incompleteCodeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*)/);
        if (incompleteCodeBlockMatch) {
            jsonText = incompleteCodeBlockMatch[1].trim();
            console.log('[Worker] Extracted from incomplete code block (truncated response)');
        }
    }

    let jsonArrayMatch = jsonText.match(/\[[\s\S]*\]/);

    if (!jsonArrayMatch) {
        console.log('[Worker] No complete JSON array, attempting to extract partial...');

        const arrayStart = jsonText.indexOf('[');
        if (arrayStart !== -1) {
            let partialArray = jsonText.substring(arrayStart);

            const lastCompleteObject = partialArray.lastIndexOf('}');
            if (lastCompleteObject !== -1) {
                partialArray = partialArray.substring(0, lastCompleteObject + 1) + ']';
                console.log('[Worker] Reconstructed array from partial response');
                jsonArrayMatch = [partialArray];
            }
        }
    }

    if (!jsonArrayMatch) {
        console.error('[Worker] No JSON array found in response:', jsonText.substring(0, 1000));
        throw new Error('Failed to parse AI response as JSON - no array found');
    }

    jsonText = jsonArrayMatch[0];

    let flashcards: GeneratedCard[];
    try {
        flashcards = JSON.parse(jsonText) as GeneratedCard[];
    } catch (parseError) {
        console.error('[Worker] JSON parse error:', parseError);
        console.error('[Worker] Attempted to parse:', jsonText.substring(0, 500));
        throw new Error('Failed to parse AI response as JSON - invalid JSON syntax');
    }

    if (!Array.isArray(flashcards)) {
        throw new Error('AI response is not an array');
    }

    console.log('[Worker] Successfully parsed', flashcards.length, 'flashcards from AI');

    return flashcards.filter(card =>
        typeof card.front === 'string' &&
        typeof card.back === 'string' &&
        card.front.trim().length > 0 &&
        card.back.trim().length > 0
    );
}

/**
 * Generate embedding for text using Gemini embedding model
 * Uses Matryoshka representation with 768 dimensions to match schema
 */
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

async function insertCards(deckId: string, generatedCards: GeneratedCard[]) {
    if (generatedCards.length === 0) {
        return 0;
    }

    console.log(`[Worker] Generating embeddings for ${generatedCards.length} cards...`);

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

    console.log(`[Worker] Successfully generated embeddings`);

    await (db as any).insert(cards).values(cardValues);

    return cardValues.length;
}

async function processDeckJob(job: PgBossJob<DeckGenerationJobData>): Promise<void> {
    const { deckId, userId, r2Key, originalFilename } = job.data;

    console.log(`[Worker] Processing job ${job.id} for deck ${deckId}`);

    try {
        const deck = await getDeckById(deckId);
        if (!deck) {
            console.warn(`[Worker] Deck ${deckId} not found, skipping`);
            return;
        }

        console.log(`[Worker] Downloading from R2: ${r2Key}`);
        await publishDeckStatus(deckId, userId, 'processing', { progress: 'Baixando arquivo...' });

        const pdfBuffer = await downloadBufferFromR2(r2Key);
        console.log(`[Worker] Downloaded ${pdfBuffer.length} bytes`);
        console.log(`[Worker] Extracting text from PDF`);

        await publishDeckStatus(deckId, userId, 'processing', { progress: 'Extraindo texto do PDF...' });
        const text = await extractTextFromPdf(pdfBuffer);

        console.log(`[Worker] Extracted ${text.length} characters`);

        if (text.trim().length < 100) {
            throw new Error('PDF does not contain enough text for card generation');
        }

        console.log(`[Worker] Generating flashcards with AI`);
        await publishDeckStatus(deckId, userId, 'processing', { progress: 'Gerando flashcards com IA...' });

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
        await publishDeckStatus(deckId, userId, 'processing', { progress: 'Salvando flashcards...' });

        const insertedCount = await insertCards(deckId, flashcards);
        console.log(`[Worker] Inserted ${insertedCount} cards`);

        await updateDeckStatus(deckId, 'ready');
        await publishDeckStatus(deckId, userId, 'ready');
        console.log(`[Worker] Deck ${deckId} marked as ready`);

        await deleteFromR2(r2Key);
        console.log(`[Worker] Deleted ${r2Key} from R2`);

    } catch (error: any) {
        console.error(`[Worker] Job ${job.id} failed:`, error);

        const userMessage = getUserFriendlyErrorMessage(error);
        await updateDeckStatus(deckId, 'failed', userMessage);
        await publishDeckStatus(deckId, userId, 'failed', { errorMessage: userMessage });

        throw error;
    }
}


async function startWorker() {
    console.log('[Worker] Starting deck generation worker...');

    const databaseUrl = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/gabarita_ai';

    const boss = new PgBoss({
        connectionString: databaseUrl,
        schema: 'pgboss',
    });

    boss.on('error', (error: Error) => {
        console.error('[Worker] pg-boss error:', error);
    });

    await boss.start();
    console.log('[Worker] pg-boss started');

    await boss.createQueue(QUEUE_NAMES.DECK_GENERATION);
    console.log(`[Worker] Queue created: ${QUEUE_NAMES.DECK_GENERATION}`);

    await boss.work<DeckGenerationJobData>(
        QUEUE_NAMES.DECK_GENERATION,
        {
            pollingIntervalSeconds: 2,
            batchSize: 1,
        },
        async (jobs) => {
            const jobArray = Array.isArray(jobs) ? jobs : [jobs];
            for (const job of jobArray) {
                await processDeckJob(job as unknown as PgBossJob<DeckGenerationJobData>);
            }
        }
    );

    console.log(`[Worker] Listening to queue: ${QUEUE_NAMES.DECK_GENERATION}`);

    const shutdown = async () => {
        console.log('[Worker] Shutting down...');
        await boss.stop({ graceful: true });
        await closePublisher();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

startWorker().catch((error) => {
    console.error('[Worker] Failed to start:', error);
    process.exit(1);
});
