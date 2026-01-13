/**
 * Session Types
 *
 * Domain: Authentication
 * Responsibility: Type definitions for session management
 */

export interface Session {
    id: string;
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface SessionData {
    userId: string;
    accessToken: string;
    refreshToken: string;
}
