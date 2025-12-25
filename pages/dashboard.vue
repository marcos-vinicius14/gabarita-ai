<script setup lang="ts">
/**
 * Dashboard Page (TanStack Query)
 * 
 * Protected page - requires authentication.
 * Uses useAuth composable with TanStack Query.
 */

import { isSuccess } from '~/types/auth'

definePageMeta({
    layout: false,
})

useSeoMeta({
    title: 'Dashboard | Gabarita.ai',
})

const { user, isAuthenticated, isLoading, logout, userQuery } = useAuth()
const router = useRouter()

watch([() => userQuery.isSuccess.value, () => userQuery.data.value], ([isSuccess, data]) => {
    if (isSuccess && !data) {
        router.push('/login')
    }
}, { immediate: true })

async function handleLogout() {
    await logout()
    await router.push('/login')
}
</script>

<template>
    <div class="min-h-screen bg-zinc-950 text-white">
        <!-- Header -->
        <header class="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <NuxtLink to="/" class="flex items-center gap-2">
                    <div
                        class="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                        <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-white" />
                    </div>
                    <span class="text-lg font-bold">Gabarita.ai</span>
                </NuxtLink>

                <div class="flex items-center gap-4">
                    <span v-if="user" class="text-sm text-zinc-400">
                        {{ user.email }}
                    </span>
                    <UButton color="gray" variant="ghost" icon="i-heroicons-arrow-right-on-rectangle"
                        @click="handleLogout">
                        Sair
                    </UButton>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 py-12">
            <div v-if="isLoading" class="flex items-center justify-center py-24">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-violet-500" />
            </div>

            <div v-else-if="user" class="space-y-8">
                <!-- Welcome -->
                <div>
                    <h1 class="text-3xl font-bold mb-2">
                        Olá, {{ user.name || 'Estudante' }}! 👋
                    </h1>
                    <p class="text-zinc-400">
                        Bem-vindo ao seu painel de estudos.
                    </p>
                </div>

                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 p-6">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                                <UIcon name="i-heroicons-document-text" class="w-6 h-6 text-violet-400" />
                            </div>
                            <div>
                                <p class="text-2xl font-bold">0</p>
                                <p class="text-sm text-zinc-400">Decks criados</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 p-6">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                <UIcon name="i-heroicons-check-circle" class="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p class="text-2xl font-bold">0</p>
                                <p class="text-sm text-zinc-400">Cards revisados</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 p-6">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                                <UIcon name="i-heroicons-fire" class="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <p class="text-2xl font-bold">0</p>
                                <p class="text-sm text-zinc-400">Dias de streak</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 p-12 text-center">
                    <div class="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto mb-6">
                        <UIcon name="i-heroicons-plus" class="w-8 h-8 text-violet-400" />
                    </div>
                    <h2 class="text-xl font-bold mb-2">Crie seu primeiro deck</h2>
                    <p class="text-zinc-400 mb-6 max-w-md mx-auto">
                        Faça upload de um PDF ou digite um tema para gerar flashcards automaticamente com IA.
                    </p>
                    <UButton color="violet" size="lg">
                        <UIcon name="i-heroicons-plus" class="w-5 h-5 mr-2" />
                        Criar Deck
                    </UButton>
                </div>
            </div>
        </main>
    </div>
</template>
