/**
 * Gamification Composable
 * 
 * Uses TanStack Query to fetch and cache gamification stats.
 */

import { useQuery } from '@tanstack/vue-query';

interface DailyActivity {
    date: string;
    count: number;
}

interface GamificationStats {
    streakDays: number;
    totalCardsReviewed: number;
    lastActiveDate: string | null;
    weeklyActivity: DailyActivity[];
}

interface GamificationResponse {
    success: boolean;
    data: GamificationStats;
}

export function useGamification() {
    const statsQuery = useQuery({
        queryKey: ['gamification', 'stats'],
        queryFn: async (): Promise<GamificationStats> => {
            const response = await $fetch<GamificationResponse>('/api/gamification/stats');

            if (!response.success) {
                throw new Error('Failed to fetch gamification stats');
            }

            return response.data;
        },
        staleTime: 1000 * 60 * 5,
    });

    const streakDays = computed(() => statsQuery.data.value?.streakDays ?? 0);
    const totalCardsReviewed = computed(() => statsQuery.data.value?.totalCardsReviewed ?? 0);
    const lastActiveDate = computed(() => statsQuery.data.value?.lastActiveDate ?? null);
    const weeklyActivity = computed(() => statsQuery.data.value?.weeklyActivity ?? []);

    const hasStreak = computed(() => streakDays.value > 0);

    const refetch = () => statsQuery.refetch();

    return {
        statsQuery,
        isLoading: computed(() => statsQuery.isLoading.value),
        isError: computed(() => statsQuery.isError.value),
        streakDays,
        totalCardsReviewed,
        lastActiveDate,
        weeklyActivity,
        hasStreak,

        refetch,
    };
}
