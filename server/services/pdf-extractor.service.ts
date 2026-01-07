/**
 * PDF Extractor Service
 * 
 * Extracts text from PDF documents using pdfjs-dist with parallel
 * processing via Worker Threads for optimal performance.
 * 
 * Features:
 * - Page-by-page extraction (low memory footprint)
 * - Parallel processing with Worker Threads
 * - Progress reporting
 * - Configurable text limits
 */

import { Worker } from 'worker_threads';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

GlobalWorkerOptions.workerSrc = '';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MAX_TEXT_LENGTH = 50_000; // 50KB max text for AI processing
const MAX_WORKERS = 4; // Maximum parallel workers
const MIN_PAGES_PER_WORKER = 5; // Minimum pages to justify a worker

export interface ExtractionProgress {
    currentPage: number;
    totalPages: number;
    extractedLength: number;
    phase: 'loading' | 'extracting' | 'complete';
}

export interface ExtractionOptions {
    maxTextLength?: number;
    maxWorkers?: number;
    onProgress?: (progress: ExtractionProgress) => void;
}

interface WorkerResult {
    startPage: number;
    endPage: number;
    text: string;
    error?: string;
}


function createPageWorker(
    pdfData: Uint8Array,
    startPage: number,
    endPage: number
): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
        const workerPath = join(__dirname, '../workers/pdf-page-worker.ts');

        const worker = new Worker(workerPath, {
            workerData: {
                pdfData,
                startPage,
                endPage,
            },
            execArgv: ['--import', 'tsx'],
        });

        worker.on('message', (result: WorkerResult) => {
            worker.terminate();
            resolve(result);
        });

        worker.on('error', (error) => {
            worker.terminate();
            reject(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
}

/**
 * Extract text from PDF using parallel workers
 * 
 * For small PDFs (< MIN_PAGES_PER_WORKER * 2), uses single-threaded extraction.
 * For larger PDFs, distributes pages across multiple workers.
 */
export async function extractTextFromPdf(
    data: ArrayBuffer | Uint8Array,
    options: ExtractionOptions = {}
): Promise<string> {
    const {
        maxTextLength = MAX_TEXT_LENGTH,
        maxWorkers = MAX_WORKERS,
        onProgress,
    } = options;

    const pdfData = data instanceof Uint8Array ? data : new Uint8Array(data);

    onProgress?.({
        currentPage: 0,
        totalPages: 0,
        extractedLength: 0,
        phase: 'loading',
    });

    const loadingTask = getDocument({
        data: pdfData,
        useSystemFonts: true,
        disableFontFace: true,
    });

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    console.log(`[PDF Extractor] Processing ${totalPages} pages`);

    if (totalPages < MIN_PAGES_PER_WORKER * 2) {
        return extractSequential(pdf, totalPages, maxTextLength, onProgress);
    }
    return extractParallel(pdfData, totalPages, maxTextLength, maxWorkers, onProgress);
}

async function extractSequential(
    pdf: any,
    totalPages: number,
    maxTextLength: number,
    onProgress?: (progress: ExtractionProgress) => void
): Promise<string> {
    const textParts: string[] = [];
    let totalLength = 0;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (totalLength >= maxTextLength) {
            console.log(`[PDF Extractor] Max text length reached at page ${pageNum}`);
            break;
        }

        onProgress?.({
            currentPage: pageNum,
            totalPages,
            extractedLength: totalLength,
            phase: 'extracting',
        });

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
            .filter((item: any): item is any => 'str' in item && typeof item.str === 'string')
            .map((item: any) => item.str as string)
            .join(' ');

        textParts.push(pageText);
        totalLength += pageText.length;

        page.cleanup();
    }

    onProgress?.({
        currentPage: totalPages,
        totalPages,
        extractedLength: totalLength,
        phase: 'complete',
    });

    const fullText = textParts.join('\n\n');
    return fullText.substring(0, maxTextLength);
}

/**
 * Parallel extraction for large PDFs using Worker Threads
 */
async function extractParallel(
    pdfData: Uint8Array,
    totalPages: number,
    maxTextLength: number,
    maxWorkers: number,
    onProgress?: (progress: ExtractionProgress) => void
): Promise<string> {
    const workerCount = Math.min(maxWorkers, Math.ceil(totalPages / MIN_PAGES_PER_WORKER));
    const pagesPerWorker = Math.ceil(totalPages / workerCount);

    console.log(`[PDF Extractor] Using ${workerCount} workers, ~${pagesPerWorker} pages each`);

    const ranges: Array<{ start: number; end: number }> = [];
    for (let i = 0; i < workerCount; i++) {
        const start = i * pagesPerWorker + 1;
        const end = Math.min((i + 1) * pagesPerWorker, totalPages);
        ranges.push({ start, end });
    }

    onProgress?.({
        currentPage: 0,
        totalPages,
        extractedLength: 0,
        phase: 'extracting',
    });

    const workerPromises = ranges.map(({ start, end }) =>
        createPageWorker(pdfData, start, end)
    );
    const results = await Promise.all(workerPromises);

    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
        console.error('[PDF Extractor] Worker errors:', errors.map(e => e.error));
    }

    const sortedResults = results
        .filter(r => !r.error)
        .sort((a, b) => a.startPage - b.startPage);

    const fullText = sortedResults.map(r => r.text).join('\n\n');
    const truncatedText = fullText.substring(0, maxTextLength);

    onProgress?.({
        currentPage: totalPages,
        totalPages,
        extractedLength: truncatedText.length,
        phase: 'complete',
    });

    console.log(`[PDF Extractor] Extracted ${truncatedText.length} characters`);

    return truncatedText;
}

/**
 * Get PDF metadata without full extraction
 */
export async function getPdfInfo(data: ArrayBuffer | Uint8Array): Promise<{
    numPages: number;
    title?: string;
    author?: string;
}> {
    const pdfData = data instanceof Uint8Array ? data : new Uint8Array(data);

    const loadingTask = getDocument({
        data: pdfData,
        useSystemFonts: true,
        disableFontFace: true,
    });

    const pdf = await loadingTask.promise;
    const metadata = await pdf.getMetadata();

    return {
        numPages: pdf.numPages,
        title: (metadata.info as any)?.Title,
        author: (metadata.info as any)?.Author,
    };
}
