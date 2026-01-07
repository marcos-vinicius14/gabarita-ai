/**
 * PDF Page Extraction Worker
 * 
 * This worker extracts text from a range of PDF pages.
 * Runs in a separate thread to enable parallel processing.
 */

import { workerData, parentPort } from 'worker_threads';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

GlobalWorkerOptions.workerSrc = '';

interface WorkerData {
    pdfData: Uint8Array;
    startPage: number;
    endPage: number;
}

interface WorkerResult {
    startPage: number;
    endPage: number;
    text: string;
    error?: string;
}

async function extractPages(): Promise<void> {
    const { pdfData, startPage, endPage } = workerData as WorkerData;

    try {
        const loadingTask = getDocument({
            data: pdfData,
            useSystemFonts: true,
            disableFontFace: true,
        });

        const pdf = await loadingTask.promise;
        const textParts: string[] = [];

        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            const pageText = textContent.items
                .filter((item): item is any => 'str' in item && typeof (item as any).str === 'string')
                .map((item: any) => item.str as string)
                .join(' ');

            textParts.push(pageText);

            // Clean up page resources
            page.cleanup();
        }

        const result: WorkerResult = {
            startPage,
            endPage,
            text: textParts.join('\n\n'),
        };

        parentPort?.postMessage(result);
    } catch (error: any) {
        const result: WorkerResult = {
            startPage,
            endPage,
            text: '',
            error: error.message,
        };
        parentPort?.postMessage(result);
    }
}

extractPages();
