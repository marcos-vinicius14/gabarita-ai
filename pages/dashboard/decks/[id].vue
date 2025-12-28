<script setup lang="ts">
/**
 * Deck Detail Page
 * 
 * Shows deck details and allows editing/deleting cards.
 * Protected page - requires authentication.
 */

import { useDeckDetail } from '~/composables/useDecks';
import type { CardItem } from '~/types/decks';

definePageMeta({
    layout: false,
});

const route = useRoute();
const router = useRouter();

const deckId = computed(() => route.params.id as string);

const {
    deck,
    cards,
    isLoading,
    isError,
    updateCardMutation,
    deleteCardMutation,
    saveCard,
    removeCard,
    refetch,
} = useDeckDetail(deckId);

useSeoMeta({
    title: computed(() => deck.value ? `${deck.value.topic} | Gabarita.ai` : 'Deck | Gabarita.ai'),
});

const editingCardId = ref<string | null>(null);
const editingFront = ref('');
const editingBack = ref('');

const isProcessing = computed(() => deck.value?.status === 'processing');
const isFailed = computed(() => deck.value?.status === 'failed');
const cardCount = computed(() => cards.value.length);

function goBack() {
    router.push('/dashboard');
}

function startStudy() {
    if (!deck.value) return;
    // TODO: Implement study session page at /study/:id
    const toast = useToast();
    toast.add({
        title: 'Em breve!',
        description: 'A sessão de estudo com repetição espaçada será implementada em breve.',
        color: 'violet',
        icon: 'i-heroicons-sparkles',
    });
}

function startEditing(card: CardItem) {
    editingCardId.value = card.id;
    editingFront.value = card.front;
    editingBack.value = card.back;
}

function cancelEditing() {
    editingCardId.value = null;
    editingFront.value = '';
    editingBack.value = '';
}

async function handleSaveCard() {
    if (!editingCardId.value) return;

    const updates: { front?: string; back?: string } = {};
    const card = cards.value.find(c => c.id === editingCardId.value);

    if (!card) return;

    if (editingFront.value.trim() !== card.front) {
        updates.front = editingFront.value.trim();
    }
    if (editingBack.value.trim() !== card.back) {
        updates.back = editingBack.value.trim();
    }

    if (Object.keys(updates).length === 0) {
        cancelEditing();
        return;
    }

    try {
        await saveCard(editingCardId.value, updates);
        cancelEditing();
    } catch {
        // Error handled by mutation
    }
}

async function handleDeleteCard(cardId: string) {
    if (!confirm('Tem certeza que deseja excluir este card?')) return;

    try {
        await removeCard(cardId);
    } catch {
        // Error handled by mutation
    }
}
</script>

<template>
    <div class="min-h-screen bg-zinc-950 text-white">
        <!-- Header -->
        <header class="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-50">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center gap-4">
                <UButton color="gray" variant="ghost" icon="i-heroicons-arrow-left" size="sm" @click="goBack">
                    <span class="hidden sm:inline">Voltar</span>
                </UButton>
                <div class="h-6 w-px bg-zinc-700" />
                <NuxtLink to="/" class="flex items-center gap-2">
                    <div
                        class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                        <UIcon name="i-heroicons-sparkles" class="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span class="text-base sm:text-lg font-bold hidden sm:block">Gabarita.ai</span>
                </NuxtLink>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
            <!-- Loading State -->
            <div v-if="isLoading" class="flex items-center justify-center py-16 sm:py-24">
                <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-violet-500" />
            </div>

            <!-- Error State -->
            <div v-else-if="isError || !deck"
                class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-red-500/30 p-6 sm:p-8 text-center">
                <div class="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-400" />
                </div>
                <h2 class="text-lg font-bold mb-2">Deck não encontrado</h2>
                <p class="text-sm text-zinc-400 mb-4">
                    O deck que você está procurando não existe ou foi removido.
                </p>
                <UButton color="violet" @click="goBack">
                    Voltar ao Dashboard
                </UButton>
            </div>

            <!-- Deck Content -->
            <div v-else class="space-y-6 sm:space-y-8">
                <!-- Deck Header -->
                <div class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 p-4 sm:p-6">
                    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div class="space-y-2">
                            <div class="flex items-center gap-3">
                                <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold">
                                    {{ deck.topic }}
                                </h1>
                                <UBadge v-if="isProcessing" color="yellow" variant="subtle"
                                    class="flex items-center gap-1">
                                    <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin" />
                                    Processando
                                </UBadge>
                                <UBadge v-else-if="isFailed" color="red" variant="subtle">
                                    Falhou
                                </UBadge>
                            </div>
                            <div class="flex items-center gap-4 text-sm text-zinc-400">
                                <span class="flex items-center gap-1.5">
                                    <UIcon name="i-heroicons-rectangle-stack" class="w-4 h-4" />
                                    {{ cardCount }} {{ cardCount === 1 ? 'card' : 'cards' }}
                                </span>
                                <span class="flex items-center gap-1.5">
                                    <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
                                    {{ new Date(deck.createdAt).toLocaleDateString('pt-BR') }}
                                </span>
                            </div>
                        </div>

                        <!-- CTA Button -->
                        <UButton color="violet" size="lg" :disabled="isProcessing || cardCount === 0"
                            @click="startStudy" class="sm:flex-shrink-0">
                            <UIcon name="i-heroicons-play" class="w-5 h-5 mr-2" />
                            Começar Sessão de Estudo
                        </UButton>
                    </div>

                    <!-- Processing Warning -->
                    <div v-if="isProcessing" class="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                        <div class="flex items-center gap-3">
                            <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-yellow-400 animate-pulse" />
                            <div>
                                <p class="text-sm text-yellow-300 font-medium">IA está gerando os flashcards...</p>
                                <p class="text-xs text-zinc-400">Isso pode levar alguns minutos. A página atualizará
                                    automaticamente.</p>
                            </div>
                        </div>
                        <UProgress animation="carousel" color="yellow" class="mt-3" />
                    </div>

                    <!-- Error Message -->
                    <div v-else-if="isFailed && deck.errorMessage"
                        class="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <div class="flex items-start gap-3">
                            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400 flex-shrink-0" />
                            <div>
                                <p class="text-sm text-red-300 font-medium">Erro no processamento</p>
                                <p class="text-xs text-zinc-400">{{ deck.errorMessage }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Cards Section -->
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg sm:text-xl font-semibold">Flashcards</h2>
                        <UButton v-if="cardCount > 0" color="gray" variant="ghost" size="sm" @click="refetch">
                            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-1.5" />
                            Atualizar
                        </UButton>
                    </div>

                    <!-- Empty State -->
                    <div v-if="cardCount === 0 && !isProcessing"
                        class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 p-6 sm:p-8 text-center">
                        <div class="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <UIcon name="i-heroicons-rectangle-stack" class="w-6 h-6 text-zinc-500" />
                        </div>
                        <h3 class="text-base font-semibold mb-2">Nenhum flashcard ainda</h3>
                        <p class="text-sm text-zinc-400">
                            Este deck ainda não possui flashcards.
                        </p>
                    </div>

                    <!-- Cards List -->
                    <div v-else class="space-y-3">
                        <div v-for="(card, index) in cards" :key="card.id"
                            class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 overflow-hidden transition-colors"
                            :class="{ 'border-violet-500/50': editingCardId === card.id }">

                            <!-- View Mode -->
                            <div v-if="editingCardId !== card.id" class="p-4 sm:p-5">
                                <div class="flex items-start justify-between gap-4">
                                    <div class="flex-1 min-w-0 space-y-3">
                                        <div>
                                            <p class="text-xs text-zinc-500 uppercase tracking-wide mb-1">Frente</p>
                                            <p class="text-sm sm:text-base text-white">{{ card.front }}</p>
                                        </div>
                                        <div class="border-t border-zinc-800 pt-3">
                                            <p class="text-xs text-zinc-500 uppercase tracking-wide mb-1">Verso</p>
                                            <p class="text-sm sm:text-base text-zinc-300">{{ card.back }}</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-1 flex-shrink-0">
                                        <UTooltip text="Editar">
                                            <UButton color="gray" variant="ghost" size="xs" icon="i-heroicons-pencil"
                                                @click="startEditing(card)" />
                                        </UTooltip>
                                        <UTooltip text="Excluir">
                                            <UButton color="gray" variant="ghost" size="xs" icon="i-heroicons-trash"
                                                :loading="deleteCardMutation.isPending.value && deleteCardMutation.variables.value === card.id"
                                                @click="handleDeleteCard(card.id)" />
                                        </UTooltip>
                                    </div>
                                </div>
                                <div class="mt-3 flex items-center justify-between text-xs text-zinc-600">
                                    <span>Card #{{ index + 1 }}</span>
                                </div>
                            </div>

                            <!-- Edit Mode -->
                            <div v-else class="p-4 sm:p-5 space-y-4">
                                <div class="space-y-3">
                                    <UFormGroup label="Frente" name="front">
                                        <UTextarea v-model="editingFront" :rows="2" size="lg" autofocus />
                                    </UFormGroup>
                                    <UFormGroup label="Verso" name="back">
                                        <UTextarea v-model="editingBack" :rows="3" size="lg" />
                                    </UFormGroup>
                                </div>
                                <div class="flex items-center justify-end gap-2">
                                    <UButton color="gray" variant="ghost" size="sm" @click="cancelEditing">
                                        Cancelar
                                    </UButton>
                                    <UButton color="violet" size="sm" :loading="updateCardMutation.isPending.value"
                                        @click="handleSaveCard">
                                        <UIcon name="i-heroicons-check" class="w-4 h-4 mr-1" />
                                        Salvar
                                    </UButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>
