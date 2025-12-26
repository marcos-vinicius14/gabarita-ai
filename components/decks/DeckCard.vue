<script setup lang="ts">
/**
 * DeckCard
 * 
 * Responsible for: Displaying a single deck with actions.
 */

import type { DeckItem } from '~/types/decks';

// Props & Emits
interface Props {
    deck: DeckItem;
}

defineProps<Props>();

const emit = defineEmits<{
    (e: 'delete', deckId: string): void;
    (e: 'study', deckId: string): void;
}>();

// Status badge config
const statusConfig = {
    ready: { label: 'Pronto', color: 'green' },
    processing: { label: 'Processando', color: 'yellow' },
    failed: { label: 'Falhou', color: 'red' },
} as const;
</script>

<template>
    <UCard class="bg-zinc-900/80 backdrop-blur-xl border-zinc-800 hover:border-zinc-700 transition-colors">
        <template #header>
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                    <h3 class="text-base sm:text-lg font-semibold text-white truncate">
                        {{ deck.topic }}
                    </h3>
                    <p class="text-xs sm:text-sm text-zinc-400 mt-0.5">
                        {{ deck.cardCount }} {{ deck.cardCount === 1 ? 'card' : 'cards' }}
                    </p>
                </div>
                <UBadge :color="statusConfig[deck.status].color" variant="subtle" size="xs" class="flex-shrink-0">
                    {{ statusConfig[deck.status].label }}
                </UBadge>
            </div>
        </template>

        <div class="flex items-center gap-2">
            <UButton color="violet" size="sm" class="flex-1" :disabled="deck.status !== 'ready'"
                @click="emit('study', deck.id)">
                <UIcon name="i-heroicons-play" class="w-4 h-4 mr-1.5" />
                Estudar
            </UButton>
            <UTooltip text="Excluir deck">
                <UButton color="gray" variant="ghost" size="sm" icon="i-heroicons-trash"
                    @click="emit('delete', deck.id)" />
            </UTooltip>
        </div>
    </UCard>
</template>
