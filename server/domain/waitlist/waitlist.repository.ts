/**
 * Waitlist Repository
 * 
 * Single Responsibility: Database interaction only.
 * This layer knows about Drizzle ORM and the database schema.
 */

import { waitlist } from '~/server/db/schema';
import type { PgDatabase } from 'drizzle-orm/pg-core';

export interface SaveEmailResult {
    success: boolean;
    isNewEmail: boolean;
}

/**
 * Saves an email to the waitlist table.
 * 
 * @param db - Drizzle database instance
 * @param email - Email address to save (should be pre-normalized)
 * @param source - Source of the signup (e.g., 'landing_page', 'instagram_ads')
 * @returns SaveEmailResult indicating success and whether it was a new email
 */
export async function saveEmail(
    db: PgDatabase<any>,
    email: string,
    source: string = 'landing_page'
): Promise<SaveEmailResult> {
    try {
        await db.insert(waitlist).values({
            email,
            source,
        });

        return { success: true, isNewEmail: true };
    } catch (error: unknown) {
        if (
            error instanceof Error &&
            (error.message.includes('unique') || error.message.includes('duplicate'))
        ) {
            return { success: true, isNewEmail: false };
        }

        throw error;
    }
}
