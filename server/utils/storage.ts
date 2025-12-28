/**
 * R2 Storage Service
 * 
 * Provides streaming upload/download operations to Cloudflare R2 (S3-compatible)
 * with automatic gzip compression to reduce storage costs.
 */

import { S3Client, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createGzip, createGunzip } from 'zlib';
import { Readable, PassThrough } from 'stream';
import { pipeline } from 'stream/promises';

let s3Client: S3Client | null = null;

/**
 * Get R2 config - works both in Nuxt context and standalone worker
 */
function getR2Config() {
    let r2AccountId: string | undefined;
    let r2AccessKeyId: string | undefined;
    let r2SecretAccessKey: string | undefined;
    let r2BucketName: string | undefined;

    try {
        const config = useRuntimeConfig();
        r2AccountId = config.r2AccountId as string;
        r2AccessKeyId = config.r2AccessKeyId as string;
        r2SecretAccessKey = config.r2SecretAccessKey as string;
        r2BucketName = config.r2BucketName as string;
    } catch {
    }

    r2AccountId = r2AccountId || process.env.R2_ACCOUNT_ID;
    r2AccessKeyId = r2AccessKeyId || process.env.R2_ACCESS_KEY_ID;
    r2SecretAccessKey = r2SecretAccessKey || process.env.R2_SECRET_ACCESS_KEY;
    r2BucketName = r2BucketName || process.env.R2_BUCKET_NAME;

    return { r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2BucketName };
}


export function getR2Client(): S3Client {
    if (s3Client) {
        return s3Client;
    }

    const { r2AccountId, r2AccessKeyId, r2SecretAccessKey } = getR2Config();

    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
        throw new Error('R2 credentials are not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.');
    }

    s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: r2AccessKeyId,
            secretAccessKey: r2SecretAccessKey,
        },
    });

    return s3Client;
}


function getBucketName(): string {
    const { r2BucketName } = getR2Config();
    if (!r2BucketName) {
        throw new Error('R2_BUCKET_NAME is not configured.');
    }
    return r2BucketName;
}

/**
 * Upload a stream to R2 with gzip compression
 * 
 * @param fileStream - The readable stream to upload
 * @param key - The object key (path) in R2
 * @param mimeType - The original MIME type of the file
 * @returns The final object key
 */
export async function uploadStreamToR2(
    fileStream: Readable,
    key: string,
    mimeType: string
): Promise<{ key: string; compressedSize: number }> {
    const client = getR2Client();
    const bucket = getBucketName();

    const gzipStream = createGzip();
    const passthrough = new PassThrough();
    let compressedSize = 0;

    passthrough.on('data', (chunk: Buffer) => {
        compressedSize += chunk.length;
    });

    const compressedStream = fileStream
        .pipe(gzipStream)
        .pipe(passthrough);

    const upload = new Upload({
        client,
        params: {
            Bucket: bucket,
            Key: key,
            Body: compressedStream,
            ContentType: mimeType,
            ContentEncoding: 'gzip',
            Metadata: {
                'original-content-type': mimeType,
            },
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024,
    });

    upload.on('httpUploadProgress', (progress) => {
        console.log(`[R2 Upload] ${key}: ${progress.loaded}/${progress.total || '?'} bytes`);
    });

    await upload.done();

    console.log(`[R2] Uploaded ${key} (compressed: ${compressedSize} bytes)`);

    return { key, compressedSize };
}

/**
 * Download a stream from R2 with automatic gunzip decompression
 * 
 * @param key - The object key (path) in R2
 * @returns A readable stream of decompressed data
 */
export async function downloadStreamFromR2(key: string): Promise<Readable> {
    const client = getR2Client();
    const bucket = getBucketName();

    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });

    const response = await client.send(command);

    if (!response.Body) {
        throw new Error(`Failed to download ${key} from R2: No body in response`);
    }

    const bodyStream = response.Body as Readable;

    if (response.ContentEncoding === 'gzip') {
        const gunzipStream = createGunzip();
        return bodyStream.pipe(gunzipStream);
    }

    return bodyStream;
}

/**
 * Download a file from R2 and accumulate into a Buffer
 * Useful for pdf-parse which requires a full buffer
 * 
 * @param key - The object key (path) in R2
 * @returns The file contents as a Buffer
 */
export async function downloadBufferFromR2(key: string): Promise<Buffer> {
    const stream = await downloadStreamFromR2(key);
    const chunks: Uint8Array[] = [];

    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

/**
 * Check if an object exists in R2
 * 
 * @param key - The object key (path) in R2
 * @returns true if the object exists
 */
export async function existsInR2(key: string): Promise<boolean> {
    const client = getR2Client();
    const bucket = getBucketName();

    try {
        await client.send(new HeadObjectCommand({
            Bucket: bucket,
            Key: key,
        }));
        return true;
    } catch (error: any) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            return false;
        }
        throw error;
    }
}

/**
 * Delete an object from R2
 * 
 * @param key - The object key (path) in R2
 */
export async function deleteFromR2(key: string): Promise<void> {
    const client = getR2Client();
    const bucket = getBucketName();

    await client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
    }));

    console.log(`[R2] Deleted ${key}`);
}

/**
 * Generate a unique key for a PDF upload
 * Format: uploads/{userId}/{deckId}/{timestamp}-{originalFilename}.pdf.gz
 */
export function generateR2Key(userId: string, deckId: string, originalFilename: string): string {
    const timestamp = Date.now();
    const sanitized = originalFilename
        .replace(/\.pdf$/i, '')
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .substring(0, 50);

    return `uploads/${userId}/${deckId}/${timestamp}-${sanitized}.pdf.gz`;
}
