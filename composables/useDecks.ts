/**
 * Decks Composable (TanStack Query)
 * 
 * Provides deck queries and mutations using TanStack Query.
 * Uses discriminated unions for type-safe response handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import type {
    DeckItem,
    DeckListResponse,
    CreateDeckResponse,
    DeleteDeckResponse,
    CreateDeckInput,
} from '~/types/decks';



export const deckKeys = {
    all: ['decks'] as const,
    list: () => [...deckKeys.all, 'list'] as const,
    detail: (id: string) => [...deckKeys.all, 'detail', id] as const,
};



async function fetchDecks(): Promise<DeckListResponse> {
    return await $fetch<DeckListResponse>('/api/decks', {
        credentials: 'include',
    });
}

async function createDeck(input: CreateDeckInput): Promise<CreateDeckResponse> {
    return await $fetch<CreateDeckResponse>('/api/decks', {
        method: 'POST',
        body: input,
        credentials: 'include',
    });
}

async function deleteDeck(deckId: string): Promise<DeleteDeckResponse> {
    return await $fetch<DeleteDeckResponse>(`/api/decks/${deckId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
}

export function useDecks() {
    const queryClient = useQueryClient();
    const toast = useToast();

    const decksQuery = useQuery({
        queryKey: deckKeys.list(),
        queryFn: fetchDecks,
        select: (data) => {
            if (data.success) {
                return data.data.decks;
            }
            return [];
        },
    });

    const decks = computed(() => decksQuery.data.value ?? []);
    const isLoading = computed(() => decksQuery.isLoading.value);
    const deckCount = computed(() => decks.value.length);

    const createMutation = useMutation({
        mutationFn: createDeck,
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: deckKeys.all });
                toast.add({
                    title: 'Sucesso!',
                    description: data.message,
                    color: 'green',
                    icon: 'i-heroicons-check-circle',
                });
            }
        },
        onError: (error: any) => {
            toast.add({
                title: 'Erro',
                description: error?.data?.message ?? 'Não foi possível criar o deck.',
                color: 'red',
                icon: 'i-heroicons-exclamation-circle',
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDeck,
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: deckKeys.all });
                toast.add({
                    title: 'Sucesso!',
                    description: data.message,
                    color: 'green',
                    icon: 'i-heroicons-check-circle',
                });
            }
        },
        onError: (error: any) => {
            toast.add({
                title: 'Erro',
                description: error?.data?.message ?? 'Não foi possível excluir o deck.',
                color: 'red',
                icon: 'i-heroicons-exclamation-circle',
            });
        },
    });

    async function createNewDeck(input: CreateDeckInput) {
        return await createMutation.mutateAsync(input);
    }

    async function removeDeck(deckId: string) {
        return await deleteMutation.mutateAsync(deckId);
    }

    function refetchDecks() {
        return decksQuery.refetch();
    }

    return {
        decks,
        deckCount,
        isLoading,
        decksQuery,
        createMutation,
        deleteMutation,
        createNewDeck,
        removeDeck,
        refetchDecks,
    };
}
