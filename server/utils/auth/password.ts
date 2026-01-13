/**
 * Password Hashing Utilities
 * 
 * Uses PBKDF2 for password hashing - Edge compatible via Web Crypto API.
 * Compatible with Cloudflare Workers.
 */

import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';

function generateSalt(length: number = 16): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
}

function toHex(bytes: Uint8Array): string {
    return encodeHexLowerCase(bytes);
}


function fromHex(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt.buffer as ArrayBuffer,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        256 // 32 bytes
    );

    return new Uint8Array(derivedBits);
}

/**
 * Hashes a password using PBKDF2
 * Returns format: $pbkdf2$<iterations>$<salt_hex>$<hash_hex>
 * 
 * @param password - Plain text password
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = generateSalt(16);
    const derivedKey = await deriveKey(password, salt);

    const saltHex = toHex(salt);
    const hashHex = toHex(derivedKey);

    return `$pbkdf2$100000$${saltHex}$${hashHex}`;
}

/**
 * Verifies a password against a stored hash
 * 
 * @param hash - Stored password hash
 * @param password - Plain text password to verify
 * @returns True if password matches
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
    const parts = hash.split('$');

    if (parts.length !== 5 || parts[1] !== 'pbkdf2') {
        return false;
    }

    const saltHex = parts[3];
    const storedHashHex = parts[4];

    const salt = fromHex(saltHex);
    const derivedKey = await deriveKey(password, salt);
    const computedHashHex = toHex(derivedKey);

    return timingSafeEqual(storedHashHex, computedHashHex);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
}

/**
 * Hashes a token using SHA-256 for storage
 * Used for refresh tokens
 * 
 * @param token - Plain token string
 * @returns Hexadecimal hash string
 */
export function hashToken(token: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hash = sha256(data);
    return toHex(hash);
}
