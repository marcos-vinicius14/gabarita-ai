/**
 * useUsage Composable
 * 
 * Fetches and manages billing usage state for the dashboard.
 * Uses TanStack Query for caching and automatic refetching.
 */

import { useQuery } from '@tanstack/vue-query';

interface UsageData {
    plan: 'free' | 'trial' | 'pro' | 'admin';
    monthlyUploads: {
        used: number;
        limit: number;
        remaining: number;
    };
    credits: number;
    decks: {
        used: number;
        limit: number;
        remaining: number;
    };
    canUpload: boolean;
    nextResetDate: string | null;
    subscription: {
        status: 'active' | 'canceled' | 'past_due' | 'trialing' | null;
        planId: 'pro_monthly' | 'pro_annual' | null;
        endsAt: string | null;
    } | null;
}

interface UsageResponse {
    success: boolean;
    message: string;
    data: UsageData;
}

export function useUsage() {
    // Only fetch if user is authenticated
    const { isAuthenticated } = useAuth();

    const {
        data: usageResponse,
        isLoading,
        error,
        refetch,
    } = useQuery<UsageResponse>({
        queryKey: ['billing', 'usage'],
        queryFn: async () => {
            const response = await $fetch<UsageResponse>('/api/billing/usage');
            return response;
        },
        staleTime: 1000 * 60, // 1 minute
        retry: 1,
        enabled: isAuthenticated, // Only run when authenticated
    });

    const usage = computed(() => usageResponse.value?.data ?? null);

    const uploadLimit = computed(() => {
        if (!usage.value) return null;
        const { monthlyUploads, credits } = usage.value;

        if (monthlyUploads.limit === Infinity) {
            return { text: 'Ilimitado', isUnlimited: true };
        }

        const totalRemaining = monthlyUploads.remaining + credits;
        return {
            text: `${monthlyUploads.used}/${monthlyUploads.limit} uploads`,
            isUnlimited: false,
            remaining: totalRemaining,
            hasCredits: credits > 0,
            creditsText: credits > 0 ? `+ ${credits} créditos` : '',
        };
    });

    const canUpload = computed(() => usage.value?.canUpload ?? false);

    const isPro = computed(() =>
        usage.value?.plan === 'pro' || usage.value?.plan === 'admin'
    );

    const isOnTrial = computed(() => usage.value?.plan === 'trial');

    return {
        usage,
        uploadLimit,
        canUpload,
        isPro,
        isOnTrial,
        isLoading,
        error,
        refetch,
    };
}
