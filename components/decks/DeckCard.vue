<script setup lang="ts">
/**
 * DeckCard
 * 
 * Responsible for: Displaying a single deck with status-aware UI.
 * - Processing: Pulsing animation, disabled actions, progress indicator
 * - Ready: Normal clickable behavior
 * - Failed: Error state with message
 */

import type { DeckItem } from '~/types/decks';

// Props & Emits
interface Props {
    deck: DeckItem;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    (e: 'delete', deckId: string): void;
    (e: 'study', deckId: string): void;
    (e: 'click', deckId: string): void;
}>();

// Computed
const isProcessing = computed(() => props.deck.status === 'processing');
const isFailed = computed(() => props.deck.status === 'failed');
const isReady = computed(() => props.deck.status === 'ready');

// Status badge config
const statusConfig = {
    ready: { label: 'Pronto', color: 'green' as const, icon: 'i-heroicons-check-circle' },
    processing: { label: 'Processando', color: 'yellow' as const, icon: 'i-heroicons-arrow-path' },
    failed: { label: 'Falhou', color: 'red' as const, icon: 'i-heroicons-exclamation-triangle' },
};

const currentStatus = computed(() => statusConfig[props.deck.status]);

// Functions
function handleCardClick() {
    if (isProcessing.value) return;
    emit('click', props.deck.id);
}

function handleStudy() {
    if (!isReady.value) return;
    emit('study', props.deck.id);
}
</script>

<template>
    <UCard class="relative overflow-hidden transition-all duration-300 cursor-pointer" :class="[
        isProcessing
            ? 'bg-zinc-900/60 border-yellow-500/30 animate-pulse'
            : isFailed
                ? 'bg-zinc-900/80 border-red-500/30 hover:border-red-500/50'
                : 'bg-zinc-900/80 border-zinc-800 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10',
        'backdrop-blur-xl'
    ]" @click="handleCardClick">
        <!-- Processing Overlay Progress -->
        <div v-if="isProcessing" class="absolute top-0 left-0 right-0 h-1 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 animate-shimmer" />
        </div>

        <template #header>
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                    <h3 class="text-base sm:text-lg font-semibold truncate"
                        :class="isProcessing ? 'text-zinc-400' : 'text-white'">
                        {{ deck.topic }}
                    </h3>
                    <p class="text-xs sm:text-sm text-zinc-400 mt-0.5">
                        <template v-if="isProcessing">
                            <span class="flex items-center gap-1.5">
                                <UIcon name="i-heroicons-sparkles" class="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                                IA gerando cards...
                            </span>
                        </template>
                        <template v-else-if="isFailed">
                            <span class="text-red-400">{{ deck.errorMessage || 'Erro no processamento' }}</span>
                        </template>
                        <template v-else>
                            {{ deck.cardCount }} {{ deck.cardCount === 1 ? 'card' : 'cards' }}
                        </template>
                    </p>
                </div>
                <UBadge :color="currentStatus.color" variant="subtle" size="xs"
                    class="flex-shrink-0 flex items-center gap-1">
                    <UIcon :name="currentStatus.icon" class="w-3 h-3" :class="{ 'animate-spin': isProcessing }" />
                    {{ currentStatus.label }}
                </UBadge>
            </div>
        </template>

        <!-- Processing State Content -->
        <div v-if="isProcessing" class="space-y-3">
            <UProgress animation="carousel" color="violet" :ui="{
                progress: {
                    background: 'bg-zinc-700'
                }
            }" />
            <p class="text-xs text-zinc-500 text-center">
                Isso pode levar alguns minutos...
            </p>
        </div>

        <!-- Ready/Failed State Actions -->
        <div v-else class="flex items-center gap-2">
            <UButton color="violet" size="sm" class="flex-1" :disabled="!isReady" @click.stop="handleStudy">
                <UIcon name="i-heroicons-play" class="w-4 h-4 mr-1.5" />
                Estudar
            </UButton>
            <UTooltip text="Excluir deck">
                <UButton color="gray" variant="ghost" size="sm" icon="i-heroicons-trash"
                    @click.stop="emit('delete', deck.id)" />
            </UTooltip>
        </div>
    </UCard>
</template>

<style scoped>
@keyframes shimmer {
    0% {
        transform: translateX(-100%);
    }

    100% {
        transform: translateX(100%);
    }
}

.animate-shimmer {
    animation: shimmer 1.5s infinite;
    background-size: 200% 100%;
}
</style>
