/**
 * Waitlist Service
 * 
 * Single Responsibility: Business logic only.
 * This layer orchestrates operations and applies business rules.
 */

import { saveEmail, type SaveEmailResult } from './waitlist.repository';
import type { PgDatabase } from 'drizzle-orm/pg-core';

export interface JoinWaitlistResult {
    success: boolean;
    message: string;
}


function normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
}

/**
 * Handles the business logic for joining the waitlist.
 * 
 * @param db - Drizzle database instance
 * @param email - Raw email address from user input
 * @param source - Optional source of the signup
 * @returns JoinWaitlistResult with success status and user-friendly message
 */
export async function joinWaitlist(
    db: PgDatabase<any>,
    email: string,
    source: string = 'landing_page'
): Promise<JoinWaitlistResult> {
    const normalizedEmail = normalizeEmail(email);

    const result: SaveEmailResult = await saveEmail(db, normalizedEmail, source);

    if (result.isNewEmail) {
        return {
            success: true,
            message: 'Você está na lista! 🎉 Fique de olho no seu email para novidades.',
        };
    }

    return {
        success: true,
        message: 'Este email já está na lista de espera! Aguarde novidades em breve.',
    };
}
