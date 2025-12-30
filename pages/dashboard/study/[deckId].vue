<script setup lang="ts">
/**
 * Study Arena Page - Flashcard review with Active Recall
 */

import { useDeckDetail } from '~/composables/useDecks';
import { onKeyStroke } from '@vueuse/core';
import type { JudgeResult, Rating } from '~/types/study';

definePageMeta({
    layout: false,
});

const route = useRoute();
const router = useRouter();
const toast = useToast();

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

    try {
        console.log('[Study UI] Calling judge API for card:', currentCard.value.id);
        const response = await $fetch<{ success: boolean; data: JudgeResult }>('/api/study/judge', {
            method: 'POST',
            body: {
                cardId: currentCard.value.id,
                userAnswer: userAnswer.value,
            },
            credentials: 'include',
        });

        console.log('[Study UI] Judge response:', response);
        if (response.success) {
            judgeResult.value = response.data;
            console.log('[Study UI] judgeResult set to:', judgeResult.value);
        }
    } catch (error: any) {
        console.error('[Study UI] Judge error:', error);
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
        console.log('[Study UI] Render conditions:', {
            isHardcoreMode: isHardcoreMode.value,
            hasSubmittedAnswer: hasSubmittedAnswer.value,
            isAnswerRevealed: isAnswerRevealed.value,
            judgeResult: judgeResult.value,
        });
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
}

onKeyStroke(' ', (e) => {
    if (!isAnswerRevealed.value && !isSessionComplete.value && !isRating.value) {
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
                <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h2 class="text-xl font-semibold mb-2">Nenhum card para estudar</h2>
                <p class="text-zinc-400 mb-6">Este deck ainda não possui cards.</p>
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

                <div v-if="isHardcoreMode && !isAnswerRevealed" class="space-y-4">
                    <UTextarea v-model="userAnswer" placeholder="Digite sua resposta..." :rows="4" autofocus
                        :disabled="isJudging" class="w-full" />
                    <UButton color="violet" block :loading="isJudging" :disabled="!userAnswer.trim()"
                        @click="submitHardcoreAnswer">
                        <UIcon v-if="!isJudging" name="i-heroicons-paper-airplane" class="w-4 h-4 mr-2" />
                        {{ isJudging ? 'Analisando...' : 'Enviar Resposta' }}
                        <span class="ml-2 text-xs text-zinc-400">(Ctrl+Enter)</span>
                    </UButton>
                </div>

                <UButton v-if="!isHardcoreMode && !isAnswerRevealed" color="violet" block size="lg"
                    @click="revealAnswer">
                    Ver Resposta
                    <span class="ml-2 text-xs text-zinc-400">(Espaço)</span>
                </UButton>

                <div v-if="isAnswerRevealed" class="space-y-4">
                    <div v-if="isHardcoreMode && hasSubmittedAnswer" class="space-y-4">
                        <div class="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                            <p class="text-sm text-zinc-400 mb-2">Sua resposta:</p>
                            <p class="text-zinc-200">{{ userAnswer }}</p>
                        </div>

                        <UAlert v-if="judgeResult" :color="judgeResult.isCorrect ? 'green' : 'red'" variant="soft"
                            :icon="judgeResult.isCorrect ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                            :title="judgeResult.isCorrect ? 'Correto!' : 'Incorreto'"
                            :description="judgeResult.feedback" />

                        <UAlert v-else color="primary" variant="soft" icon="i-heroicons-information-circle"
                            title="Compare sua resposta"
                            description="Não foi possível obter avaliação da IA. Compare manualmente com a resposta correta abaixo." />
                    </div>

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

        <footer v-if="deck && !isSessionComplete"
            class="fixed bottom-0 left-0 right-0 py-3 bg-zinc-950/80 backdrop-blur border-t border-zinc-800">
            <p class="text-center text-sm text-zinc-500">
                {{ deck.topic }}
            </p>
        </footer>
    </div>
</template>
