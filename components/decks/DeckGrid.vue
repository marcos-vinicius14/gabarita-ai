<script setup lang="ts">
/**
 * DeckGrid
 * 
 * Responsible for: Displaying a responsive grid of deck cards with loading/empty states.
 */

import type { DeckItem } from '~/types/decks';

// Props & Emits
interface Props {
    decks: DeckItem[];
    isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    isLoading: false,
});

const emit = defineEmits<{
    (e: 'delete', deckId: string): void;
    (e: 'study', deckId: string): void;
    (e: 'create'): void;
}>();

// Computed
const hasDecks = computed(() => props.decks.length > 0);
</script>

<template>
    <!-- Loading State -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div v-for="i in 3" :key="i" class="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4 sm:p-5">
            <div class="space-y-3">
                <USkeleton class="h-5 w-3/4" />
                <USkeleton class="h-4 w-1/4" />
                <div class="flex gap-2 pt-2">
                    <USkeleton class="h-9 flex-1" />
                    <USkeleton class="h-9 w-9" />
                </div>
            </div>
        </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!hasDecks"
        class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 p-6 sm:p-8 lg:p-12 text-center">
        <div
            class="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <UIcon name="i-heroicons-folder-plus" class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-violet-400" />
        </div>
        <h2 class="text-lg sm:text-xl font-bold mb-2">Crie seu primeiro deck</h2>
        <p class="text-sm sm:text-base text-zinc-400 mb-4 sm:mb-6 max-w-md mx-auto">
            Faça upload de um PDF ou digite um tema para gerar flashcards automaticamente com IA.
        </p>
        <UButton color="violet" size="md" class="sm:hidden" @click="emit('create')">
            <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-1.5" />
            Criar Deck
        </UButton>
        <UButton color="violet" size="lg" class="hidden sm:inline-flex" @click="emit('create')">
            <UIcon name="i-heroicons-plus" class="w-5 h-5 mr-2" />
            Criar Deck
        </UButton>
    </div>

    <!-- Deck Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <DecksDeckCard v-for="deck in decks" :key="deck.id" :deck="deck" @delete="emit('delete', $event)"
            @study="emit('study', $event)" />
    </div>
</template>
