/**
 * GET /api/gamification/stats - Returns user's gamification stats
 */

import {
    getUserGamificationData,
    getReviewActivityForDays,
} from '~/server/domain/gamification';
import {
    handleException,
    AuthenticationRequiredException,
    NotFoundException,
} from '~/server/utils/exceptions';

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user;

        if (!user) {
            throw new AuthenticationRequiredException();
        }

        const [gamificationData, weeklyActivity] = await Promise.all([
            getUserGamificationData(user.sub),
            getReviewActivityForDays(user.sub, 7),
        ]);

        if (!gamificationData) {
            throw new NotFoundException('Usuário não encontrado.');
        }

        const activityMap = new Map<string, number>();
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            activityMap.set(dateStr, 0);
        }

        for (const activity of weeklyActivity) {
            activityMap.set(activity.date, activity.count);
        }
        const weeklyActivityArray = Array.from(activityMap.entries()).map(([date, count]) => ({
            date,
            count,
        }));

        return {
            success: true,
            data: {
                streakDays: gamificationData.streakDays,
                totalCardsReviewed: gamificationData.totalCardsReviewed,
                lastActiveDate: gamificationData.lastActiveDate,
                weeklyActivity: weeklyActivityArray,
            },
        };
    } catch (error) {
        return handleException(event, error);
    }
});
