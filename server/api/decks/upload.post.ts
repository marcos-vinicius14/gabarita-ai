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
import { uploadStreamToR2, generateR2Key } from '~/server/utils/storage';
import { addDeckGenerationJob } from '~/server/utils/queue';
import { createDeckFromUpload, countDecksByUser } from '~/server/domain/decks/deck.repository';
import { findUserById } from '~/server/domain/auth/auth.repository';
import { getEffectiveRole } from '~/server/domain/trial/trial.service';
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

export default defineEventHandler(async (event) => {
    try {
        // 1. Authentication check
        const sessionUser = event.context.user;

        if (!sessionUser) {
            throw new AuthenticationRequiredException();
        }

        // 2. Get full user for role/trial check
        const user = await findUserById(sessionUser.sub);

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        // 3. Check deck limits
        const currentCount = await countDecksByUser(user.id);
        const effectiveRole = getEffectiveRole({
            id: user.id,
            role: user.role,
            trialExpiresAt: user.trialExpiresAt,
        }) as UserRole;

        const limit = DECK_LIMITS[effectiveRole];

        if (currentCount >= limit) {
            throw new ForbiddenException(
                `Você atingiu o limite de ${limit} decks. Faça upgrade para criar mais.`,
                { code: 'DECK_LIMIT_EXCEEDED' }
            );
        }

        // 4. Get the raw request (Node.js IncomingMessage)
        const req = event.node.req;
        const contentType = req.headers['content-type'];

        if (!contentType || !contentType.includes('multipart/form-data')) {
            throw new BadRequestException(
                'Content-Type deve ser multipart/form-data.',
                { code: 'INVALID_CONTENT_TYPE' }
            );
        }

        // 5. Process upload with busboy
        const result = await new Promise<{
            deck: Awaited<ReturnType<typeof createDeckFromUpload>>;
            jobId: string;
        }>((resolve, reject) => {
            const busboy = Busboy({
                headers: req.headers,
                limits: {
                    fileSize: MAX_PDF_SIZE_BYTES,
                    files: 1, // Only accept one file
                },
            });

            let fileProcessed = false;
            let uploadError: Error | null = null;

            busboy.on('file', async (fieldname, fileStream, info) => {
                const { filename, mimeType } = info;

                // Validate field name
                if (fieldname !== 'file') {
                    fileStream.resume(); // Drain the stream
                    return;
                }

                // Validate MIME type
                if (!ALLOWED_PDF_MIME_TYPES.includes(mimeType as any)) {
                    fileStream.resume();
                    uploadError = new BadRequestException(
                        'Apenas arquivos PDF são permitidos.',
                        { code: 'INVALID_FILE_TYPE' }
                    );
                    return;
                }

                // Validate filename
                if (!filename || !filename.toLowerCase().endsWith('.pdf')) {
                    fileStream.resume();
                    uploadError = new BadRequestException(
                        'Nome do arquivo deve terminar com .pdf',
                        { code: 'INVALID_FILENAME' }
                    );
                    return;
                }

                fileProcessed = true;

                try {
                    // Generate deck ID early so we can use it in the R2 key
                    const deckId = uuidv7();
                    const r2Key = generateR2Key(user.id, deckId, filename);

                    // Track file size (for validation)
                    let totalBytes = 0;
                    let fileTooLarge = false;

                    fileStream.on('data', (chunk: Buffer) => {
                        totalBytes += chunk.length;
                        if (totalBytes > MAX_PDF_SIZE_BYTES) {
                            fileTooLarge = true;
                            fileStream.destroy(new Error('File too large'));
                        }
                    });

                    // Convert busboy stream to Readable for our upload function
                    const readableStream = Readable.from(fileStream);

                    // Upload to R2 with gzip compression
                    console.log(`[Upload] Starting upload for ${filename} (user: ${user.id})`);

                    const uploadResult = await uploadStreamToR2(
                        readableStream,
                        r2Key,
                        mimeType
                    );

                    if (fileTooLarge) {
                        throw new BadRequestException(
                            `Arquivo muito grande. Máximo permitido: ${MAX_PDF_SIZE_BYTES / 1024 / 1024}MB`,
                            { code: 'FILE_TOO_LARGE' }
                        );
                    }

                    console.log(`[Upload] R2 upload complete: ${r2Key}`);

                    // Create deck in database
                    const deck = await createDeckFromUpload(user.id, filename, r2Key);

                    console.log(`[Upload] Deck created: ${deck.id}`);

                    // Add job to queue
                    const job = await addDeckGenerationJob({
                        deckId: deck.id,
                        userId: user.id,
                        r2Key,
                        originalFilename: filename,
                    });

                    console.log(`[Upload] Job queued: ${job.id}`);

                    resolve({
                        deck,
                        jobId: job.id || deck.id,
                    });
                } catch (err) {
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
                reject(err);
            });

            busboy.on('finish', () => {
                if (uploadError) {
                    reject(uploadError);
                    return;
                }

                if (!fileProcessed) {
                    reject(new BadRequestException(
                        'Nenhum arquivo PDF foi enviado. Use o campo "file".',
                        { code: 'NO_FILE_UPLOADED' }
                    ));
                }
            });

            // Pipe the request to busboy
            req.pipe(busboy);
        });

        setResponseStatus(event, 202); // Accepted (processing in background)
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
