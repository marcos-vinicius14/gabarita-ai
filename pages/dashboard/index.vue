<script setup lang="ts">
/**
 * Dashboard Page
 * 
 * Protected page - requires authentication.
 * Displays user's decks with full CRUD functionality.
 */

import { useDecks } from '~/composables/useDecks';
import { useTrial } from '~/composables/useTrial';
import { useUsage } from '~/composables/useUsage';
import { useGamification } from '~/composables/useGamification';
import type { DeckItem } from '~/types/decks';

definePageMeta({
    layout: false,
})

useSeoMeta({
    title: 'Dashboard | Gabarita.ai',
})

const { user, isAuthenticated, isLoading: isAuthLoading, logout, userQuery } = useAuth()
const router = useRouter()

watch([() => userQuery.isSuccess.value, () => userQuery.data.value], ([isSuccess, data]) => {
    if (isSuccess && !data) {
        router.push('/login')
    }
}, { immediate: true })

const { decks, deckCount, isLoading: isDecksLoading } = useDecks()

const { isOnTrial, daysRemaining, effectiveRole, startTrial, startTrialMutation } = useTrial()

const { usage, uploadLimit, canUpload, isPro, refetch: refetchUsage } = useUsage()

const { streakDays, totalCardsReviewed, weeklyActivity, isLoading: isGamificationLoading } = useGamification()

const userId = computed(() => user.value?.id)
useWebSocket({ userId })

const canStartTrial = computed(() => {
    if (!user.value) return false
    return user.value.role === 'free' && user.value.trialExpiresAt === null
})

const isCreateModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isBuyCreditsModalOpen = ref(false)
const isUpgradeModalOpen = ref(false)
const isProfileModalOpen = ref(false)
const deckToDelete = ref<DeckItem | null>(null)

// Computed
const isLoading = computed(() => isAuthLoading.value || isDecksLoading.value)

async function handleLogout(): Promise<void> {
    await logout()
    await router.push('/login')
}

function openCreateModal() {
    isCreateModalOpen.value = true
}

function handleDeleteRequest(deckId: string) {
    const deck = decks.value.find(d => d.id === deckId)
    if (!deck) return

    deckToDelete.value = deck
    isDeleteModalOpen.value = true
}

function handleStudy(deckId: string) {
    router.push(`/dashboard/study/${deckId}`)
}

function handleDeckClick(deckId: string) {
    router.push(`/dashboard/decks/${deckId}`)
}

function handleDeckCreated() {
    // Modal handles success toast; just close
}

function handleDeckDeleted() {
    deckToDelete.value = null
}
</script>

<template>
    <div class="min-h-screen bg-zinc-950 text-white">
        <!-- Header -->
        <header class="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
                <NuxtLink to="/" class="flex items-center gap-2">
                    <div
                        class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                        <UIcon name="i-heroicons-sparkles" class="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span class="text-base sm:text-lg font-bold">Gabarita.ai</span>
                </NuxtLink>

                <div class="flex items-center gap-2 sm:gap-4">
                    <!-- Streak Badge -->
                    <GamificationStreakBadge v-if="user" :streak-days="streakDays" />

                    <UButton v-if="user" color="gray" variant="ghost" size="sm" @click="isProfileModalOpen = true">
                        <UIcon name="i-heroicons-user-circle" class="w-5 h-5 mr-1.5" />
                        <span class="hidden sm:inline">Meu Perfil</span>
                    </UButton>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
            <!-- Auth Loading -->
            <div v-if="isAuthLoading" class="flex items-center justify-center py-16 sm:py-24">
                <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-violet-500" />
            </div>

            <div v-else-if="user" class="space-y-6 sm:space-y-8">
                <!-- Welcome -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">
                            Olá, {{ user.name || 'Estudante' }}! 👋
                        </h1>
                        <p class="text-sm sm:text-base text-zinc-400">
                            Bem-vindo ao seu painel de estudos.
                        </p>
                    </div>

                    <!-- Create Button (Desktop) -->
                    <UButton v-if="decks.length > 0" color="violet" size="md" class="hidden sm:flex"
                        @click="openCreateModal">
                        <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-1.5" />
                        Novo Deck
                    </UButton>
                </div>

                <!-- Trial CTA Banner -->
                <div v-if="canStartTrial"
                    class="bg-gradient-to-r from-violet-600/20 via-violet-500/10 to-violet-600/20 backdrop-blur-xl rounded-xl border border-violet-500/30 p-4 sm:p-6">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div class="flex items-center gap-3 sm:gap-4">
                            <div
                                class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                                <UIcon name="i-heroicons-sparkles" class="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
                            </div>
                            <div>
                                <h3 class="font-semibold text-white">Experimente o Gabarita Pro por 7 dias!</h3>
                                <p class="text-sm text-zinc-400">Crie até 10 decks e desbloqueie recursos premium.</p>
                            </div>
                        </div>
                        <UButton color="violet" size="md" :loading="startTrialMutation.isPending.value"
                            @click="startTrial">
                            <UIcon name="i-heroicons-rocket-launch" class="w-4 h-4 mr-1.5" />
                            Começar Trial Grátis
                        </UButton>
                    </div>
                </div>

                <!-- Trial Active Banner -->
                <div v-else-if="isOnTrial && daysRemaining !== null"
                    class="bg-gradient-to-r from-green-600/20 via-green-500/10 to-green-600/20 backdrop-blur-xl rounded-xl border border-green-500/30 p-4 sm:p-5">
                    <div class="flex items-center gap-3">
                        <div
                            class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                            <UIcon name="i-heroicons-check-badge" class="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                        </div>
                        <div>
                            <span class="font-medium text-green-400">Trial Ativo</span>
                            <span class="text-zinc-400 ml-2">{{ daysRemaining }} {{ daysRemaining === 1 ? 'dia restante'
                                : 'dias restantes' }}</span>
                        </div>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 p-4 sm:p-6">
                        <div class="flex items-center gap-3 sm:gap-4">
                            <div
                                class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                                <UIcon name="i-heroicons-document-text" class="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
                            </div>
                            <div class="min-w-0">
                                <p class="text-xl sm:text-2xl font-bold">{{ deckCount }}</p>
                                <p class="text-xs sm:text-sm text-zinc-400">Decks criados</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 p-4 sm:p-6">
                        <div class="flex items-center gap-3 sm:gap-4">
                            <div
                                class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                <UIcon name="i-heroicons-check-circle" class="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                            </div>
                            <div class="min-w-0">
                                <p class="text-xl sm:text-2xl font-bold">{{ totalCardsReviewed }}</p>
                                <p class="text-xs sm:text-sm text-zinc-400">Cards revisados</p>
                            </div>
                        </div>
                    </div>

                    <div
                        class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
                        <div class="flex items-center gap-3 sm:gap-4">
                            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                :class="streakDays > 0 ? 'bg-orange-500/20' : 'bg-zinc-800/50'">
                                <UIcon name="i-heroicons-fire" class="w-5 h-5 sm:w-6 sm:h-6"
                                    :class="streakDays > 0 ? 'text-orange-400' : 'text-zinc-500'" />
                            </div>
                            <div class="min-w-0">
                                <p class="text-xl sm:text-2xl font-bold">{{ streakDays }}</p>
                                <p class="text-xs sm:text-sm text-zinc-400">Dias de streak</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Usage/Credits Card -->
                <div v-if="usage && !isPro"
                    class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 p-4 sm:p-6">
                    <div class="flex items-center justify-between gap-3 sm:gap-4">
                        <div class="flex items-center gap-3 sm:gap-4">
                            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                :class="canUpload ? 'bg-blue-500/20' : 'bg-red-500/20'">
                                <UIcon
                                    :name="canUpload ? 'i-heroicons-cloud-arrow-up' : 'i-heroicons-exclamation-triangle'"
                                    class="w-5 h-5 sm:w-6 sm:h-6"
                                    :class="canUpload ? 'text-blue-400' : 'text-red-400'" />
                            </div>
                            <div class="min-w-0">
                                <p class="text-xl sm:text-2xl font-bold">
                                    {{ uploadLimit?.remaining ?? 0 }}
                                </p>
                                <p class="text-xs sm:text-sm text-zinc-400">
                                    Uploads disponíveis
                                    <span v-if="usage.credits > 0" class="text-blue-400">
                                        ({{ usage.credits }} créditos)
                                    </span>
                                </p>
                            </div>
                        </div>
                        <UButton v-if="!canUpload" color="violet" size="sm" @click="isBuyCreditsModalOpen = true">
                            <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-1" />
                            Comprar
                        </UButton>
                    </div>
                </div>

                <!-- Decks Section -->
                <div class="space-y-4">
                    <div v-if="decks.length > 0" class="flex items-center justify-between">
                        <h2 class="text-lg sm:text-xl font-semibold">Seus Decks</h2>
                    </div>

                    <DecksDeckGrid :decks="decks" :is-loading="isDecksLoading" @create="openCreateModal"
                        @delete="handleDeleteRequest" @study="handleStudy" @click="handleDeckClick" />
                </div>
            </div>
        </main>

        <!-- FAB (Mobile) -->
        <UButton v-if="user && decks.length > 0" color="violet" size="lg"
            class="fixed bottom-6 right-6 sm:hidden rounded-full shadow-lg shadow-violet-500/25" icon="i-heroicons-plus"
            @click="openCreateModal" />

        <!-- Modals -->
        <DecksCreateDeckModal v-model="isCreateModalOpen" @created="handleDeckCreated" />

        <DecksDeleteDeckModal v-model="isDeleteModalOpen" :deck="deckToDelete" @deleted="handleDeckDeleted" />

        <BillingBuyCreditsModal v-model="isBuyCreditsModalOpen" />

        <BillingUpgradePlansModal v-model="isUpgradeModalOpen" />

        <UserProfileModal v-if="user" v-model:open="isProfileModalOpen" :user="user" @logout="handleLogout"
            @upgrade="isProfileModalOpen = false; isUpgradeModalOpen = true" />
    </div>
</template>
