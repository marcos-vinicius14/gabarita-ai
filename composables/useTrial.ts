/**
 * Trial Composable (TanStack Query)
 * 
 * Provides trial queries and mutations using TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';

interface TrialStatusData {
    isOnTrial: boolean;
    daysRemaining: number | null;
    expiresAt: string | null;
    effectiveRole: 'free' | 'trial' | 'pro' | 'admin';
}

interface TrialStatusResponse {
    success: true;
    message: string;
    data: TrialStatusData;
}

interface StartTrialResponse {
    success: true;
    message: string;
    data: {
        trialExpiresAt: string;
        daysRemaining: number;
    };
}

export const trialKeys = {
    all: ['trial'] as const,
    status: () => [...trialKeys.all, 'status'] as const,
};

async function fetchTrialStatus(): Promise<TrialStatusResponse> {
    return await $fetch<TrialStatusResponse>('/api/trial/status', {
        credentials: 'include',
    });
}

async function postStartTrial(): Promise<StartTrialResponse> {
    return await $fetch<StartTrialResponse>('/api/trial/start', {
        method: 'POST',
        credentials: 'include',
    });
}

export function useTrial() {
    const queryClient = useQueryClient();
    const toast = useToast();

    const trialQuery = useQuery({
        queryKey: trialKeys.status(),
        queryFn: fetchTrialStatus,
        enabled: import.meta.client, // Only run on client-side
        select: (data) => data.data,
        retry: false,
    });

    const isOnTrial = computed(() => trialQuery.data.value?.isOnTrial ?? false);
    const daysRemaining = computed(() => trialQuery.data.value?.daysRemaining ?? null);

    const trialExpiresAt = computed(() => {
        const date = trialQuery.data.value?.expiresAt;
        return date ? new Date(date) : null;
    });
    const effectiveRole = computed(() => trialQuery.data.value?.effectiveRole ?? 'free');
    const isLoading = computed(() => trialQuery.isLoading.value);

    const startTrialMutation = useMutation({
        mutationFn: postStartTrial,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: trialKeys.all });
            queryClient.invalidateQueries({ queryKey: ['auth'] });

            toast.add({
                title: 'Trial Ativado! 🎉',
                description: data.message,
                color: 'green',
                icon: 'i-heroicons-check-circle',
            });
        },
        onError: (error: any) => {
            toast.add({
                title: 'Erro',
                description: error?.data?.message ?? 'Não foi possível iniciar o período de teste.',
                color: 'red',
                icon: 'i-heroicons-exclamation-circle',
            });
        },
    });

    async function startTrial() {
        return await startTrialMutation.mutateAsync();
    }

    function refetchStatus() {
        return trialQuery.refetch();
    }

    return {
        isOnTrial,
        daysRemaining,
        trialExpiresAt,
        effectiveRole,
        isLoading,
        trialQuery,
        startTrialMutation,
        startTrial,
        refetchStatus,
    };
}
