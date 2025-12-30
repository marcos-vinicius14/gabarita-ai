<script setup lang="ts">
/**
 * Study Arena Page
 * 
 * Flashcard review interface with Active Recall loop.
 * Supports Fast Mode and Hardcore Mode with FSRS rating system.
 */

import { useDeckDetail } from '~/composables/useDecks';
import { onKeyStroke } from '@vueuse/core';

definePageMeta({
    layout: false,
});

const route = useRoute();
const router = useRouter();
const toast = useToast();

const deckId = computed(() => route.params.deckId as string);

// Fetch deck and cards
const { deck, cards, isLoading, isError } = useDeckDetail(deckId);

const currentIndex = ref(0);
const isAnswerRevealed = ref(false);
const isHardcoreMode = ref(false);
const userAnswer = ref('');
const isJudging = ref(false);
const hasSubmittedAnswer = ref(false);

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

    isJudging.value = true;

    await new Promise(resolve => setTimeout(resolve, 1000));

    isJudging.value = false;
    hasSubmittedAnswer.value = true;
    isAnswerRevealed.value = true;
}

function rateCard(rating: 'again' | 'hard' | 'good' | 'easy') {
    console.log(`[Study] Card ${currentCard.value?.id} rated: ${rating}`);
    nextCard();
}

function nextCard() {
    currentIndex.value++;
    isAnswerRevealed.value = false;
    userAnswer.value = '';
    hasSubmittedAnswer.value = false;
}

function exitStudy() {
    router.push('/dashboard');
}

function restartSession() {
    currentIndex.value = 0;
    isAnswerRevealed.value = false;
    userAnswer.value = '';
    hasSubmittedAnswer.value = false;
}

onKeyStroke(' ', (e) => {
    if (!isAnswerRevealed.value && !isSessionComplete.value) {
        e.preventDefault();
        revealAnswer();
    }
});

onKeyStroke('Enter', (e) => {
    if (e.ctrlKey && isHardcoreMode.value && !hasSubmittedAnswer.value) {
        e.preventDefault();
        submitHardcoreAnswer();
    }
});

onKeyStroke('1', () => {
    if (isAnswerRevealed.value) rateCard('again');
});

onKeyStroke('2', () => {
    if (isAnswerRevealed.value) rateCard('hard');
});

onKeyStroke('3', () => {
    if (isAnswerRevealed.value) rateCard('good');
});

onKeyStroke('4', () => {
    if (isAnswerRevealed.value) rateCard('easy');
});

onKeyStroke('Escape', () => {
    exitStudy();
});
</script>

<template>
    <div class="min-h-screen bg-zinc-950 text-white">
        <!-- Header -->
        <header class="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-50">
            <div class="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
                <!-- Exit Button -->
                <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="exitStudy">
                    Sair
                </UButton>

                <!-- Progress -->
                <div class="flex items-center gap-3 flex-1 max-w-xs mx-4">
                    <UProgress :value="progress" color="violet" size="sm" class="flex-1" />
                    <span class="text-sm text-zinc-400 whitespace-nowrap">
                        {{ cardsRemaining }} restantes
                    </span>
                </div>

                <!-- Mode Toggle -->
                <div class="flex items-center gap-2">
                    <span class="text-sm text-zinc-400">Hardcore</span>
                    <UToggle v-model="isHardcoreMode" color="violet" />
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-2xl mx-auto px-4 py-8 sm:py-12">
            <!-- Loading State -->
            <div v-if="isLoading" class="flex items-center justify-center py-24">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-violet-500" />
            </div>

            <!-- Error State -->
            <div v-else-if="isError" class="text-center py-24">
                <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 class="text-xl font-semibold mb-2">Erro ao carregar deck</h2>
                <p class="text-zinc-400 mb-6">Não foi possível carregar os cards para estudo.</p>
                <UButton color="violet" @click="exitStudy">Voltar ao Dashboard</UButton>
            </div>

            <!-- No Cards State -->
            <div v-else-if="cards.length === 0" class="text-center py-24">
                <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h2 class="text-xl font-semibold mb-2">Nenhum card para estudar</h2>
                <p class="text-zinc-400 mb-6">Este deck ainda não possui cards.</p>
                <UButton color="violet" @click="exitStudy">Voltar ao Dashboard</UButton>
            </div>

            <!-- Session Complete -->
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

            <!-- Active Study Card -->
            <div v-else class="space-y-6">
                <!-- Card Container -->
                <div
                    class="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 sm:p-8 min-h-[300px] flex flex-col">
                    <!-- Card Number -->
                    <div class="text-sm text-zinc-500 mb-4">
                        Card {{ currentIndex + 1 }} de {{ cards.length }}
                    </div>

                    <!-- Front (Question) -->
                    <div class="flex-1 flex items-center justify-center">
                        <p class="text-xl sm:text-2xl font-medium text-center leading-relaxed">
                            {{ currentCard?.front }}
                        </p>
                    </div>
                </div>

                <!-- Answer Input (Hardcore Mode) -->
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

                <!-- Reveal Button (Fast Mode) -->
                <UButton v-if="!isHardcoreMode && !isAnswerRevealed" color="violet" block size="lg"
                    @click="revealAnswer">
                    Ver Resposta
                    <span class="ml-2 text-xs text-zinc-400">(Espaço)</span>
                </UButton>

                <!-- Answer Revealed -->
                <div v-if="isAnswerRevealed" class="space-y-4">
                    <!-- User Answer (Hardcore Mode) -->
                    <div v-if="isHardcoreMode && hasSubmittedAnswer" class="space-y-4">
                        <div class="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                            <p class="text-sm text-zinc-400 mb-2">Sua resposta:</p>
                            <p class="text-zinc-200">{{ userAnswer }}</p>
                        </div>

                        <!-- Judge Alert (Mocked) -->
                        <UAlert color="primary" variant="soft" icon="i-heroicons-beaker"
                            title="Agente Juiz (IA) em desenvolvimento"
                            description="Por enquanto, compare sua resposta manualmente com a resposta correta abaixo." />
                    </div>

                    <!-- Correct Answer (Back) -->
                    <div class="bg-emerald-500/10 rounded-xl p-6 border border-emerald-500/30">
                        <p class="text-sm text-emerald-400 mb-2 font-medium">Resposta:</p>
                        <p class="text-lg text-zinc-100 leading-relaxed">
                            {{ currentCard?.back }}
                        </p>
                    </div>

                    <!-- FSRS Rating Buttons -->
                    <div class="grid grid-cols-4 gap-2 sm:gap-3">
                        <UButton color="rose" variant="soft" block @click="rateCard('again')">
                            <div class="flex flex-col items-center gap-1">
                                <span class="font-medium">Errei</span>
                                <span class="text-xs opacity-80">1</span>
                            </div>
                        </UButton>

                        <UButton color="orange" variant="soft" block @click="rateCard('hard')">
                            <div class="flex flex-col items-center gap-1">
                                <span class="font-medium">Difícil</span>
                                <span class="text-xs opacity-80">2</span>
                            </div>
                        </UButton>

                        <UButton color="primary" variant="soft" block @click="rateCard('good')">
                            <div class="flex flex-col items-center gap-1">
                                <span class="font-medium">Bom</span>
                                <span class="text-xs opacity-80">3</span>
                            </div>
                        </UButton>

                        <UButton color="emerald" variant="soft" block @click="rateCard('easy')">
                            <div class="flex flex-col items-center gap-1">
                                <span class="font-medium">Fácil</span>
                                <span class="text-xs opacity-80">4</span>
                            </div>
                        </UButton>
                    </div>

                    <!-- Keyboard Hint -->
                    <div class="flex items-center justify-center gap-2 text-xs text-zinc-400">
                        <UIcon name="i-heroicons-keyboard" class="w-4 h-4" />
                        <span>Use as teclas 1-4 para avaliar rapidamente</span>
                    </div>
                </div>
            </div>
        </main>

        <!-- Deck Title Footer -->
        <footer v-if="deck && !isSessionComplete"
            class="fixed bottom-0 left-0 right-0 py-3 bg-zinc-950/80 backdrop-blur border-t border-zinc-800">
            <p class="text-center text-sm text-zinc-500">
                {{ deck.topic }}
            </p>
        </footer>
    </div>
</template>
