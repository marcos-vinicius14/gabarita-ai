/**
 * Gamification Repository
 * 
 * Single Responsibility: Database operations for gamification features.
 * Handles streak tracking and user statistics.
 */

import { eq, sql, and, gte, lte } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { users } from '~/server/domain/auth/schema/users';
import { reviews } from '~/server/db/tables/reviews';



export interface UserGamificationData {
    streakDays: number;
    lastActiveDate: string | null;
    totalCardsReviewed: number;
}

export interface DailyActivity {
    date: string;
    count: number;
}


export async function getUserGamificationData(userId: string): Promise<UserGamificationData | null> {
    const result = await (db as any)
        .select({
            streakDays: users.streakDays,
            lastActiveDate: users.lastActiveDate,
            totalCardsReviewed: users.totalCardsReviewed,
        })
        .from(users)
        .where(eq(users.id, userId));

    if (result.length === 0) {
        return null;
    }

    return result[0] as UserGamificationData;
}

export async function updateUserStreakData(
    userId: string,
    streakDays: number,
    lastActiveDate: string
): Promise<void> {
    await (db as any)
        .update(users)
        .set({
            streakDays,
            lastActiveDate,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

export async function incrementTotalCardsReviewed(userId: string): Promise<void> {
    await (db as any)
        .update(users)
        .set({
            totalCardsReviewed: sql`${users.totalCardsReviewed} + 1`,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}

export async function getReviewActivityForDays(
    userId: string,
    days: number
): Promise<DailyActivity[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const result = await (db as any)
        .select({
            date: sql<string>`DATE(${reviews.reviewedAt})`,
            count: sql<number>`COUNT(*)::int`,
        })
        .from(reviews)
        .where(
            and(
                eq(reviews.userId, userId),
                gte(reviews.reviewedAt, startDate),
                lte(reviews.reviewedAt, endDate)
            )
        )
        .groupBy(sql`DATE(${reviews.reviewedAt})`)
        .orderBy(sql`DATE(${reviews.reviewedAt})`);

    return result as DailyActivity[];
}
