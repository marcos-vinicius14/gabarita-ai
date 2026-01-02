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
    UploadDeckResponse,
    DeckDetailResponse,
    UpdateCardResponse,
    DeleteCardResponse,
    CreateDeckInput,
    UpdateCardInput,
    CardItem,
} from '~/types/decks';
import { type MutationError, getApiErrorMessage } from '~/types/errors';

export const deckKeys = {
    all: ['decks'] as const,
    list: () => [...deckKeys.all, 'list'] as const,
    detail: (id: string) => [...deckKeys.all, 'detail', id] as const,
};

export const cardKeys = {
    all: ['cards'] as const,
    byDeck: (deckId: string) => [...cardKeys.all, 'deck', deckId] as const,
};

async function fetchDecks(): Promise<DeckListResponse> {
    return await $fetch<DeckListResponse>('/api/decks', {
        credentials: 'include',
    });
}

async function fetchDeckDetail(deckId: string): Promise<DeckDetailResponse> {
    return await $fetch<DeckDetailResponse>(`/api/decks/${deckId}`, {
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

async function uploadDeck(file: File, bankStyle?: string): Promise<UploadDeckResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (bankStyle) {
        formData.append('bankStyle', bankStyle);
    }

    return await $fetch<UploadDeckResponse>('/api/decks/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
    });
}

async function deleteDeck(deckId: string): Promise<DeleteDeckResponse> {
    return await $fetch<DeleteDeckResponse>(`/api/decks/${deckId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
}

async function updateCard(cardId: string, input: UpdateCardInput): Promise<UpdateCardResponse> {
    return await $fetch<UpdateCardResponse>(`/api/cards/${cardId}`, {
        method: 'PATCH',
        body: input,
        credentials: 'include',
    });
}

async function deleteCard(cardId: string): Promise<DeleteCardResponse> {
    return await $fetch<DeleteCardResponse>(`/api/cards/${cardId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
}


export function useDecks() {
    const queryClient = useQueryClient();
    const toast = useToast();

    const hasProcessingDecks = ref(false);

    const decksQuery = useQuery({
        queryKey: deckKeys.list(),
        queryFn: fetchDecks,
        enabled: import.meta.client,
        refetchInterval: () => hasProcessingDecks.value ? 5000 : false, // Poll every 5s if processing
        select: (data) => {
            if (data.success) {
                return data.data.decks;
            }
            return [];
        },
    });

    watch(() => decksQuery.data.value, (newDecks) => {
        hasProcessingDecks.value = (newDecks ?? []).some(deck => deck.status === 'processing');
    }, { immediate: true });

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
        onError: (error: MutationError) => {
            toast.add({
                title: 'Erro',
                description: getApiErrorMessage(error, 'Não foi possível criar o deck.'),
                color: 'red',
                icon: 'i-heroicons-exclamation-circle',
            });
        },
    });

    const uploadMutation = useMutation({
        mutationFn: ({ file, bankStyle }: { file: File; bankStyle?: string }) =>
            uploadDeck(file, bankStyle),
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: deckKeys.all });
                toast.add({
                    title: 'Upload recebido!',
                    description: 'Seu PDF está sendo processado pela IA. Isso pode levar alguns minutos.',
                    color: 'violet',
                    icon: 'i-heroicons-sparkles',
                });
            }
        },
        onError: (error: MutationError) => {
            toast.add({
                title: 'Erro no upload',
                description: getApiErrorMessage(error, 'Não foi possível fazer o upload do PDF.'),
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
        onError: (error: MutationError) => {
            toast.add({
                title: 'Erro',
                description: getApiErrorMessage(error, 'Não foi possível excluir o deck.'),
                color: 'red',
                icon: 'i-heroicons-exclamation-circle',
            });
        },
    });

    async function createNewDeck(input: CreateDeckInput) {
        return await createMutation.mutateAsync(input);
    }

    async function uploadNewDeck(file: File, bankStyle?: string) {
        return await uploadMutation.mutateAsync({ file, bankStyle });
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
        hasProcessingDecks,
        decksQuery,
        createMutation,
        uploadMutation,
        deleteMutation,
        createNewDeck,
        uploadNewDeck,
        removeDeck,
        refetchDecks,
    };
}

// =============================================================================
// Deck Detail Composable
// =============================================================================

export function useDeckDetail(deckId: Ref<string> | string) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const id = isRef(deckId) ? deckId : ref(deckId);

    const deckQuery = useQuery({
        queryKey: computed(() => deckKeys.detail(id.value)),
        queryFn: () => fetchDeckDetail(id.value),
        enabled: computed(() => !!id.value && import.meta.client),
        select: (data) => {
            if (data.success) {
                return data.data.deck;
            }
            return null;
        },
    });

    const deck = computed(() => deckQuery.data.value);
    const cards = computed(() => deckQuery.data.value?.cards ?? []);
    const isLoading = computed(() => deckQuery.isLoading.value);
    const isError = computed(() => deckQuery.isError.value);

    const updateCardMutation = useMutation({
        mutationFn: ({ cardId, input }: { cardId: string; input: UpdateCardInput }) =>
            updateCard(cardId, input),
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: deckKeys.detail(id.value) });
                toast.add({
                    title: 'Card atualizado!',
                    color: 'green',
                    icon: 'i-heroicons-check-circle',
                });
            }
        },
        onError: (error: MutationError) => {
            toast.add({
                title: 'Erro',
                description: getApiErrorMessage(error, 'Não foi possível atualizar o card.'),
                color: 'red',
                icon: 'i-heroicons-exclamation-circle',
            });
        },
    });

    const deleteCardMutation = useMutation({
        mutationFn: deleteCard,
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: deckKeys.detail(id.value) });
                toast.add({
                    title: 'Card excluído!',
                    color: 'green',
                    icon: 'i-heroicons-check-circle',
                });
            }
        },
        onError: (error: MutationError) => {
            toast.add({
                title: 'Erro',
                description: getApiErrorMessage(error, 'Não foi possível excluir o card.'),
                color: 'red',
                icon: 'i-heroicons-exclamation-circle',
            });
        },
    });

    async function saveCard(cardId: string, input: UpdateCardInput) {
        return await updateCardMutation.mutateAsync({ cardId, input });
    }

    async function removeCard(cardId: string) {
        return await deleteCardMutation.mutateAsync(cardId);
    }

    function refetch() {
        return deckQuery.refetch();
    }

    return {
        deck,
        cards,
        isLoading,
        isError,
        deckQuery,
        updateCardMutation,
        deleteCardMutation,
        saveCard,
        removeCard,
        refetch,
    };
}
