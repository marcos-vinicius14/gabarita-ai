<script setup lang="ts">
/**
 * Study Arena Page - Flashcard review with Active Recall
 */

import { useDeckDetail } from '~/composables/useDecks';
import { useMarkdown } from '~/composables/useMarkdown';
import { onKeyStroke } from '@vueuse/core';
import type { JudgeResult, Rating } from '~/types/study';

definePageMeta({
    layout: false,
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { parseMarkdown } = useMarkdown();

const deckId = computed(() => route.params.deckId as string);
const { deck, cards, isLoading, isError } = useDeckDetail(deckId);

const currentIndex = ref(0);
const isAnswerRevealed = ref(false);
const isHardcoreMode = ref(false);
const userAnswer = ref('');
const isJudging = ref(false);
const isRating = ref(false);
const hasSubmittedAnswer = ref(false);
const judgeResult = ref<JudgeResult | null>(null);
const streamingFeedback = ref('');
const isStreaming = ref(false);

// Modal states
const showUserAnswerModal = ref(false);
const showCorrectAnswerModal = ref(false);

const currentCard = computed(() => cards.value[currentIndex.value]);
const progress = computed(() => {
    if (cards.value.length === 0) return 0;
    return Math.round((currentIndex.value / cards.value.length) * 100);
});
const isSessionComplete = computed(() => currentIndex.value >= cards.value.length);
const cardsRemaining = computed(() => Math.max(0, cards.value.length - currentIndex.value));

function revealAnswer() {
    if (isHardcoreMode.value && !hasSubmittedAnswer.value) {
        submitHardcoreAnswer();
        return;
    }
    isAnswerRevealed.value = true;
}

async function submitHardcoreAnswer() {
    if (!userAnswer.value.trim()) {
        toast.add({
            title: 'Digite sua resposta',
            description: 'Escreva sua resposta antes de enviar.',
            color: 'orange',
            icon: 'i-heroicons-exclamation-triangle',
        });
        return;
    }

    if (!currentCard.value) return;

    isJudging.value = true;
    judgeResult.value = null;
    streamingFeedback.value = '';

    try {
        const response = await $fetch<{ success: boolean; data: JudgeResult }>('/api/study/judge', {
            method: 'POST',
            body: {
                cardId: currentCard.value.id,
                userAnswer: userAnswer.value,
            },
            credentials: 'include',
        });

        if (response.success) {
            judgeResult.value = response.data;

            // If incorrect, start streaming explanation
            if (!response.data.isCorrect) {
                await streamExplanation();
            }
        }
    } catch (error: any) {
        toast.add({
            title: 'Erro ao avaliar',
            description: error?.data?.message ?? 'Não foi possível avaliar sua resposta.',
            color: 'red',
            icon: 'i-heroicons-exclamation-circle',
        });
    } finally {
        isJudging.value = false;
        hasSubmittedAnswer.value = true;
        isAnswerRevealed.value = true;
    }
}

async function streamExplanation() {
    if (!currentCard.value) return;

    isStreaming.value = true;
    streamingFeedback.value = '';

    try {
        const response = await fetch('/api/study/judge-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                cardId: currentCard.value.id,
                userAnswer: userAnswer.value,
            }),
        });

        if (!response.ok || !response.body) {
            throw new Error('Streaming failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            streamingFeedback.value += chunk;
        }
    } catch (error) {
        console.error('[Study UI] Streaming error:', error);
    } finally {
        isStreaming.value = false;
    }
}

async function rateCard(rating: 'again' | 'hard' | 'good' | 'easy') {
    if (!currentCard.value || isRating.value) return;

    const ratingMap: Record<string, Rating> = {
        again: 1,
        hard: 2,
        good: 3,
        easy: 4,
    };

    isRating.value = true;

    try {
        await $fetch('/api/study/log', {
            method: 'POST',
            body: {
                cardId: currentCard.value.id,
                rating: ratingMap[rating],
            },
            credentials: 'include',
        });

        nextCard();
    } catch (error: any) {
        toast.add({
            title: 'Erro ao registrar',
            description: error?.data?.message ?? 'Não foi possível registrar sua avaliação.',
            color: 'red',
            icon: 'i-heroicons-exclamation-circle',
        });
    } finally {
        isRating.value = false;
    }
}

function nextCard() {
    currentIndex.value++;
    isAnswerRevealed.value = false;
    userAnswer.value = '';
    hasSubmittedAnswer.value = false;
    judgeResult.value = null;
    streamingFeedback.value = '';
    showUserAnswerModal.value = false;
    showCorrectAnswerModal.value = false;
}

function exitStudy() {
    router.push('/dashboard');
}

function restartSession() {
    currentIndex.value = 0;
    isAnswerRevealed.value = false;
    userAnswer.value = '';
    hasSubmittedAnswer.value = false;
    judgeResult.value = null;
    streamingFeedback.value = '';
}

function formatNextReview(dateString: string): string {
    const now = new Date();
    const nextReview = new Date(dateString);
    const diffMs = nextReview.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
        return `${Math.max(1, diffMinutes)} minuto${diffMinutes !== 1 ? 's' : ''}`;
    }
    if (diffHours < 24) {
        return `${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    }
    if (diffDays === 1) {
        return '1 dia';
    }
    return `${diffDays} dias`;
}

onKeyStroke(' ', (e) => {
    // Only trigger space shortcut in Fast Mode (not Hardcore where user is typing)
    if (!isHardcoreMode.value && !isAnswerRevealed.value && !isSessionComplete.value && !isRating.value) {
        e.preventDefault();
        revealAnswer();
    }
});

onKeyStroke('Enter', (e) => {
    if (e.ctrlKey && isHardcoreMode.value && !hasSubmittedAnswer.value && !isJudging.value) {
        e.preventDefault();
        submitHardcoreAnswer();
    }
});

onKeyStroke('1', () => {
    if (isAnswerRevealed.value && !isRating.value) rateCard('again');
});

onKeyStroke('2', () => {
    if (isAnswerRevealed.value && !isRating.value) rateCard('hard');
});

onKeyStroke('3', () => {
    if (isAnswerRevealed.value && !isRating.value) rateCard('good');
});

onKeyStroke('4', () => {
    if (isAnswerRevealed.value && !isRating.value) rateCard('easy');
});

onKeyStroke('Escape', () => {
    exitStudy();
});
</script>

<template>
    <div class="min-h-screen bg-zinc-950 text-white">
        <header class="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-50">
            <div class="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
                <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="exitStudy">
                    Sair
                </UButton>

                <div class="flex items-center gap-3 flex-1 max-w-xs mx-4">
                    <UProgress :value="progress" color="violet" size="sm" class="flex-1" />
                    <span class="text-sm text-zinc-400 whitespace-nowrap">
                        {{ cardsRemaining }} restantes
                    </span>
                </div>

                <div class="flex items-center gap-2">
                    <span class="text-sm text-zinc-400">Hardcore</span>
                    <UToggle v-model="isHardcoreMode" color="violet" />
                </div>
            </div>
        </header>

        <main class="max-w-2xl mx-auto px-4 py-8 sm:py-12">
            <div v-if="isLoading" class="flex items-center justify-center py-24">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-violet-500" />
            </div>

            <div v-else-if="isError" class="text-center py-24">
                <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 class="text-xl font-semibold mb-2">Erro ao carregar deck</h2>
                <p class="text-zinc-400 mb-6">Não foi possível carregar os cards para estudo.</p>
                <UButton color="violet" @click="exitStudy">Voltar ao Dashboard</UButton>
            </div>

            <div v-else-if="cards.length === 0" class="text-center py-24">
                <div class="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                    <UIcon name="i-heroicons-check-badge" class="w-10 h-10 text-emerald-400" />
                </div>
                <h2 class="text-2xl font-bold mb-2">Bom trabalho! 🎉</h2>
                <p class="text-zinc-400 mb-2">Não há cards para revisar no momento.</p>
                <p v-if="deck?.nextReviewDate" class="text-zinc-500 mb-6">
                    Volte em <span class="text-violet-400 font-medium">{{ formatNextReview(deck.nextReviewDate)
                    }}</span>
                </p>
                <p v-else class="text-zinc-500 mb-6">
                    Todos os cards já foram revisados!
                </p>
                <UButton color="violet" @click="exitStudy">Voltar ao Dashboard</UButton>
            </div>

            <div v-else-if="isSessionComplete" class="text-center py-24">
                <div class="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                    <UIcon name="i-heroicons-trophy" class="w-10 h-10 text-emerald-400" />
                </div>
                <h2 class="text-2xl font-bold mb-2">Sessão Completa! 🎉</h2>
                <p class="text-zinc-400 mb-8">
                    Você revisou todos os {{ cards.length }} cards deste deck.
                </p>
                <div class="flex gap-4 justify-center">
                    <UButton color="gray" variant="soft" @click="restartSession">
                        <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-2" />
                        Estudar Novamente
                    </UButton>
                    <UButton color="violet" @click="exitStudy">
                        <UIcon name="i-heroicons-home" class="w-4 h-4 mr-2" />
                        Voltar ao Dashboard
                    </UButton>
                </div>
            </div>

            <div v-else class="space-y-6">
                <div
                    class="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 sm:p-8 min-h-[300px] flex flex-col">
                    <div class="text-sm text-zinc-500 mb-4">
                        Card {{ currentIndex + 1 }} de {{ cards.length }}
                    </div>

                    <div class="flex-1 flex items-center justify-center">
                        <p class="text-xl sm:text-2xl font-medium text-center leading-relaxed">
                            {{ currentCard?.front }}
                        </p>
                    </div>
                </div>

                <div v-if="isHardcoreMode && !hasSubmittedAnswer && !isJudging" class="space-y-4">
                    <UTextarea v-model="userAnswer" placeholder="Digite sua resposta..." :rows="4" autofocus
                        :disabled="isJudging" class="w-full" />
                    <UButton color="violet" block :loading="isJudging" :disabled="!userAnswer.trim()"
                        @click="submitHardcoreAnswer">
                        <UIcon v-if="!isJudging" name="i-heroicons-paper-airplane" class="w-4 h-4 mr-2" />
                        {{ isJudging ? 'Analisando...' : 'Enviar Resposta' }}
                        <span class="ml-2 text-xs text-zinc-400">(Ctrl+Enter)</span>
                    </UButton>
                </div>

                <!-- Loading State while Judging -->
                <div v-if="isJudging" class="flex flex-col items-center justify-center py-12">
                    <UIcon name="i-heroicons-sparkles" class="w-12 h-12 text-violet-500 animate-pulse mb-4" />
                    <p class="text-zinc-400">Analisando sua resposta...</p>
                </div>

                <UButton v-if="!isHardcoreMode && !isAnswerRevealed" color="violet" block size="lg"
                    @click="revealAnswer">
                    Ver Resposta
                    <span class="ml-2 text-xs text-zinc-400">(Espaço)</span>
                </UButton>

                <!-- Answer Revealed Section (Clean Layout) -->
                <div v-if="hasSubmittedAnswer && !isJudging" class="space-y-4">
                    <!-- Result Badge -->
                    <div class="flex items-center justify-center">
                        <div v-if="judgeResult"
                            :class="judgeResult.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'"
                            class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-medium">
                            <UIcon :name="judgeResult.isCorrect ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                                class="w-6 h-6" />
                            {{ judgeResult.isCorrect ? 'Correto!' : 'Incorreto' }}
                        </div>
                    </div>

                    <!-- Streaming Explanation (Main Focus for Incorrect) -->
                    <div v-if="judgeResult && !judgeResult.isCorrect && (streamingFeedback || isStreaming)"
                        class="bg-amber-500/10 rounded-xl p-5 border border-amber-500/30">
                        <div class="flex items-center gap-2 mb-3">
                            <UIcon name="i-heroicons-light-bulb" class="w-5 h-5 text-amber-400" />
                            <p class="text-sm text-amber-400 font-medium">Explicação do Tutor</p>
                            <UIcon v-if="isStreaming" name="i-heroicons-arrow-path"
                                class="w-4 h-4 text-amber-400 animate-spin ml-auto" />
                        </div>
                        <div class="prose prose-invert prose-sm max-w-none text-zinc-200"
                            v-html="parseMarkdown(streamingFeedback)"></div>
                        <span v-if="isStreaming" class="animate-pulse text-amber-400">▋</span>
                    </div>

                    <!-- View Answers Buttons (Clean - Modal Triggers) -->
                    <div class="flex gap-3">
                        <UButton v-if="isHardcoreMode" color="gray" variant="ghost" class="flex-1"
                            @click="showUserAnswerModal = true">
                            <UIcon name="i-heroicons-document-text" class="w-4 h-4 mr-2" />
                            Ver minha resposta
                        </UButton>
                        <UButton color="gray" variant="ghost" class="flex-1" @click="showCorrectAnswerModal = true">
                            <UIcon name="i-heroicons-check-badge" class="w-4 h-4 mr-2" />
                            Ver resposta correta
                        </UButton>
                    </div>

                    <!-- Rating Buttons with Recommended Highlight -->
                    <div class="grid grid-cols-4 gap-2 sm:gap-3">
                        <UButton color="rose" :variant="judgeResult?.suggestedRating === 1 ? 'solid' : 'soft'" block
                            :loading="isRating" @click="rateCard('again')"
                            :class="{ 'ring-2 ring-rose-400 ring-offset-2 ring-offset-zinc-950': judgeResult?.suggestedRating === 1 }">
                            <div class="flex flex-col items-center gap-1">
                                <span class="font-medium">Errei</span>
                                <span class="text-xs opacity-80">1</span>
                            </div>
                        </UButton>

                        <UButton color="orange" :variant="judgeResult?.suggestedRating === 2 ? 'solid' : 'soft'" block
                            :loading="isRating" @click="rateCard('hard')"
                            :class="{ 'ring-2 ring-orange-400 ring-offset-2 ring-offset-zinc-950': judgeResult?.suggestedRating === 2 }">
                            <div class="flex flex-col items-center gap-1">
                                <span class="font-medium">Difícil</span>
                                <span class="text-xs opacity-80">2</span>
                            </div>
                        </UButton>

                        <UButton color="primary" :variant="judgeResult?.suggestedRating === 3 ? 'solid' : 'soft'" block
                            :loading="isRating" @click="rateCard('good')"
                            :class="{ 'ring-2 ring-violet-400 ring-offset-2 ring-offset-zinc-950': judgeResult?.suggestedRating === 3 }">
                            <div class="flex flex-col items-center gap-1">
                                <span class="font-medium">Bom</span>
                                <span class="text-xs opacity-80">3</span>
                            </div>
                        </UButton>

                        <UButton color="emerald" :variant="judgeResult?.suggestedRating === 4 ? 'solid' : 'soft'" block
                            :loading="isRating" @click="rateCard('easy')"
                            :class="{ 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950': judgeResult?.suggestedRating === 4 }">
                            <div class="flex flex-col items-center gap-1">
                                <span class="font-medium">Fácil</span>
                                <span class="text-xs opacity-80">4</span>
                            </div>
                        </UButton>
                    </div>

                    <div class="flex items-center justify-center gap-2 text-xs text-zinc-400">
                        <UIcon name="i-heroicons-keyboard" class="w-4 h-4" />
                        <span>Use as teclas 1-4 para avaliar rapidamente</span>
                    </div>
                </div>

                <!-- Fast Mode Answer Revealed -->
                <div v-if="!isHardcoreMode && isAnswerRevealed" class="space-y-4">
                    <div class="bg-emerald-500/10 rounded-xl p-6 border border-emerald-500/30">
                        <p class="text-sm text-emerald-400 mb-2 font-medium">Resposta:</p>
                        <p class="text-lg text-zinc-100 leading-relaxed">
                            {{ currentCard?.back }}
                        </p>
                    </div>

                    <div class="grid grid-cols-4 gap-2 sm:gap-3">
                        <UButton color="rose" variant="soft" block :loading="isRating" @click="rateCard('again')">
                            <div class="flex flex-col items-center gap-1">
                                <span class="font-medium">Errei</span>
                                <span class="text-xs opacity-80">1</span>
                            </div>
                        </UButton>

                        <UButton color="orange" variant="soft" block :loading="isRating" @click="rateCard('hard')">
                            <div class="flex flex-col items-center gap-1">
                                <span class="font-medium">Difícil</span>
                                <span class="text-xs opacity-80">2</span>
                            </div>
                        </UButton>

                        <UButton color="primary" variant="soft" block :loading="isRating" @click="rateCard('good')">
                            <div class="flex flex-col items-center gap-1">
                                <span class="font-medium">Bom</span>
                                <span class="text-xs opacity-80">3</span>
                            </div>
                        </UButton>

                        <UButton color="emerald" variant="soft" block :loading="isRating" @click="rateCard('easy')">
                            <div class="flex flex-col items-center gap-1">
                                <span class="font-medium">Fácil</span>
                                <span class="text-xs opacity-80">4</span>
                            </div>
                        </UButton>
                    </div>

                    <div class="flex items-center justify-center gap-2 text-xs text-zinc-400">
                        <UIcon name="i-heroicons-keyboard" class="w-4 h-4" />
                        <span>Use as teclas 1-4 para avaliar rapidamente</span>
                    </div>
                </div>
            </div>
        </main>

        <!-- User Answer Modal -->
        <UModal v-model="showUserAnswerModal">
            <UCard>
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-zinc-400" />
                        <h3 class="text-lg font-semibold">Sua Resposta</h3>
                    </div>
                </template>
                <p class="text-zinc-300 leading-relaxed whitespace-pre-wrap">{{ userAnswer }}</p>
            </UCard>
        </UModal>

        <!-- Correct Answer Modal -->
        <UModal v-model="showCorrectAnswerModal">
            <UCard>
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-check-badge" class="w-5 h-5 text-emerald-400" />
                        <h3 class="text-lg font-semibold">Resposta Correta</h3>
                    </div>
                </template>
                <p class="text-zinc-300 leading-relaxed whitespace-pre-wrap">{{ currentCard?.back }}</p>
            </UCard>
        </UModal>

        <footer v-if="deck && !isSessionComplete"
            class="fixed bottom-0 left-0 right-0 py-3 bg-zinc-950/80 backdrop-blur border-t border-zinc-800">
            <p class="text-center text-sm text-zinc-500">
                {{ deck.topic }}
            </p>
        </footer>
    </div>
</template>
