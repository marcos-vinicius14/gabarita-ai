/**
 * Token Generation & Verification Utilities
 * 
 * Access Token: JWT (15 min expiry)
 * Refresh Token: Opaque random string (7 days expiry)
 * 
 * Uses 'jose' library for JWT - Edge compatible
 */

import * as jose from 'jose';
import { encodeHexLowerCase } from '@oslojs/encoding';

export interface TokenPayload {
    sub: string;
    role: string;
    iat: number;
    exp: number;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}


const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Gets the JWT secret from runtime config
 * Must be at least 32 characters for HS256
 */
function getJwtSecret(): Uint8Array {
    const config = useRuntimeConfig();
    const secret = config.jwtSecret as string;

    if (!secret || secret.length < 32) {
        throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres');
    }

    return new TextEncoder().encode(secret);
}

/**
 * Generates a secure random string for refresh tokens
 * 
 * @param length - Number of random bytes
 * @returns Hexadecimal string
 */
export function generateRandomToken(length: number = 32): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return encodeHexLowerCase(bytes);
}

/**
 * Generates an access token (JWT)
 * 
 * @param userId - User ID to encode
 * @param role - User role for RBAC
 * @returns Signed JWT string
 */
export async function generateAccessToken(userId: string, role: string): Promise<string> {
    const secret = getJwtSecret();

    const jwt = await new jose.SignJWT({ role })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_EXPIRY)
        .sign(secret);

    return jwt;
}

/**
 * Verifies an access token
 * 
 * @param token - JWT to verify
 * @returns Decoded payload
 * @throws If token is invalid or expired
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload> {
    const secret = getJwtSecret();

    const { payload } = await jose.jwtVerify(token, secret);

    return {
        sub: payload.sub!,
        role: payload.role as string,
        iat: payload.iat!,
        exp: payload.exp!,
    };
}

/**
 * Generates a complete token pair for a user
 * 
 * @param userId - User ID
 * @param role - User role
 * @returns Access token, refresh token, and expiry info
 */
export async function generateTokenPair(userId: string, role: string): Promise<TokenPair> {
    const accessToken = await generateAccessToken(userId, role);
    const refreshToken = generateRandomToken(32);

    return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60,
    };
}

export function getRefreshTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    return expiry;
}

export function generateFamilyId(): string {
    return generateRandomToken(16);
}
