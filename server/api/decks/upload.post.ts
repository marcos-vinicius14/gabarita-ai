/**
 * POST /api/decks/upload
 * 
 * Streaming PDF upload endpoint for creating decks.
 * Uses busboy for efficient multipart parsing (no buffering).
 * Pipes directly to R2 with gzip compression.
 * 
 * Request: multipart/form-data with 'file' field containing PDF
 * Response: { success: true, data: { deck, jobId } }
 */

import Busboy from 'busboy';
import { Readable } from 'stream';
import { uuidv7 } from 'uuidv7';
import { uploadStreamToR2, generateR2Key, deleteFromR2 } from '~/server/utils/storage';
import { addDeckGenerationJob } from '~/server/utils/queue';
import { createDeckFromUpload, countDecksByUser } from '~/server/domain/decks/deck.repository';
import { findUserById } from '~/server/domain/auth/auth.repository';
import { checkCanUploadPDF, consumeUpload } from '~/server/domain/billing/billing.service';
import {
    MAX_PDF_SIZE_BYTES,
    ALLOWED_PDF_MIME_TYPES,
    DECK_LIMITS,
    type UserRole,
} from '~/server/domain/decks/deck.types';
import {
    handleException,
    AuthenticationRequiredException,
    BadRequestException,
    ForbiddenException,
} from '~/server/utils/exceptions';

const UPLOAD_TIMEOUT_MS = 120_000; // 2 minutes for slow connections

export default defineEventHandler(async (event) => {
    try {
        const sessionUser = event.context.user;

        if (!sessionUser) {
            throw new AuthenticationRequiredException();
        }

        const user = await findUserById(sessionUser.sub);

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        const uploadCheck = await checkCanUploadPDF(user.id);
        if (!uploadCheck.allowed) {
            throw new ForbiddenException(
                uploadCheck.reason ?? 'Limite de uploads atingido.',
                { code: 'UPLOAD_LIMIT_EXCEEDED' }
            );
        }

        const currentCount = await countDecksByUser(user.id);
        const effectiveRole = user.role as UserRole;

        const limit = DECK_LIMITS[effectiveRole];

        if (currentCount >= limit) {
            throw new ForbiddenException(
                `Você atingiu o limite de ${limit} decks. Faça upgrade para criar mais.`,
                { code: 'DECK_LIMIT_EXCEEDED' }
            );
        }

        const req = event.node.req;
        const contentType = req.headers['content-type'];

        if (!contentType || !contentType.includes('multipart/form-data')) {
            throw new BadRequestException(
                'Content-Type deve ser multipart/form-data.',
                { code: 'INVALID_CONTENT_TYPE' }
            );
        }

        const result = await new Promise<{
            deck: Awaited<ReturnType<typeof createDeckFromUpload>>;
            jobId: string;
        }>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                req.destroy();
                reject(new BadRequestException(
                    'Upload expirou. Tente novamente com uma conexão mais rápida.',
                    { code: 'UPLOAD_TIMEOUT' }
                ));
            }, UPLOAD_TIMEOUT_MS);

            const busboy = Busboy({
                headers: req.headers,
                limits: {
                    fileSize: MAX_PDF_SIZE_BYTES,
                    files: 1,
                },
            });

            let fileProcessed = false;
            let uploadError: Error | null = null;

            const clearUploadTimeout = () => clearTimeout(timeoutId);

            busboy.on('file', async (fieldname, fileStream, info) => {
                const { filename, mimeType } = info;

                if (fieldname !== 'file') {
                    fileStream.resume();
                    return;
                }

                if (!ALLOWED_PDF_MIME_TYPES.includes(mimeType as any)) {
                    fileStream.resume();
                    uploadError = new BadRequestException(
                        'Apenas arquivos PDF são permitidos.',
                        { code: 'INVALID_FILE_TYPE' }
                    );
                    return;
                }

                if (!filename || !filename.toLowerCase().endsWith('.pdf')) {
                    fileStream.resume();
                    uploadError = new BadRequestException(
                        'Nome do arquivo deve terminar com .pdf',
                        { code: 'INVALID_FILENAME' }
                    );
                    return;
                }

                fileProcessed = true;

                let uploadedR2Key: string | null = null;

                try {
                    const deckId = uuidv7();
                    const r2Key = generateR2Key(user.id, deckId, filename);

                    let totalBytes = 0;
                    let fileTooLarge = false;

                    fileStream.on('data', (chunk: Buffer) => {
                        totalBytes += chunk.length;
                        if (totalBytes > MAX_PDF_SIZE_BYTES) {
                            fileTooLarge = true;
                            fileStream.destroy(new Error('File too large'));
                        }
                    });

                    const readableStream = Readable.from(fileStream);

                    console.log(`[Upload] Starting upload for ${filename} (user: ${user.id})`);

                    const uploadResult = await uploadStreamToR2(
                        readableStream,
                        r2Key,
                        mimeType
                    );

                    uploadedR2Key = r2Key;

                    if (fileTooLarge) {
                        throw new BadRequestException(
                            `Arquivo muito grande. Máximo permitido: ${MAX_PDF_SIZE_BYTES / 1024 / 1024}MB`,
                            { code: 'FILE_TOO_LARGE' }
                        );
                    }

                    console.log(`[Upload] R2 upload complete: ${r2Key}`);

                    const deck = await createDeckFromUpload(user.id, filename, r2Key);

                    console.log(`[Upload] Deck created: ${deck.id}`);
                    const jobId = await addDeckGenerationJob({
                        deckId: deck.id,
                        userId: user.id,
                        r2Key,
                        originalFilename: filename,
                    });

                    console.log(`[Upload] Job queued: ${jobId}`);

                    // Consume upload quota/credit after successful deck creation
                    const consumeSource = await consumeUpload(user.id, deck.id);
                    console.log(`[Upload] Consumed upload from: ${consumeSource}`);

                    clearUploadTimeout();
                    resolve({
                        deck,
                        jobId: jobId || deck.id,
                    });
                } catch (err) {
                    if (uploadedR2Key) {
                        console.log(`[Upload] Cleaning up orphaned file: ${uploadedR2Key}`);
                        try {
                            await deleteFromR2(uploadedR2Key);
                            console.log(`[Upload] Orphaned file deleted: ${uploadedR2Key}`);
                        } catch (cleanupErr) {
                            console.error(`[Upload] Failed to cleanup orphaned file:`, cleanupErr);
                        }
                    }
                    clearUploadTimeout();
                    reject(err);
                }
            });

            busboy.on('filesLimit', () => {
                uploadError = new BadRequestException(
                    'Apenas um arquivo pode ser enviado por vez.',
                    { code: 'TOO_MANY_FILES' }
                );
            });

            busboy.on('error', (err) => {
                clearUploadTimeout();
                reject(err);
            });

            busboy.on('finish', () => {
                if (uploadError) {
                    clearUploadTimeout();
                    reject(uploadError);
                    return;
                }

                if (!fileProcessed) {
                    clearUploadTimeout();
                    reject(new BadRequestException(
                        'Nenhum arquivo PDF foi enviado. Use o campo "file".',
                        { code: 'NO_FILE_UPLOADED' }
                    ));
                }
            });

            req.pipe(busboy);
        });

        setResponseStatus(event, 202);
        return {
            success: true,
            message: 'Upload recebido. Processando PDF...',
            data: {
                deck: result.deck,
                jobId: result.jobId,
            },
        };
    } catch (error) {
        return handleException(event, error);
    }
});
