<script setup lang="ts">
/**
 * Dashboard Page (TanStack Query)
 * 
 * Protected page - requires authentication.
 * Uses useAuth composable with TanStack Query.
 */

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
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
                <NuxtLink to="/" class="flex items-center gap-2">
                    <div
                        class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                        <UIcon name="i-heroicons-sparkles" class="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span class="text-base sm:text-lg font-bold">Gabarita.ai</span>
                </NuxtLink>

                <div class="flex items-center gap-2 sm:gap-4">
                    <span v-if="user" class="hidden sm:block text-sm text-zinc-400 truncate max-w-[150px]">
                        {{ user.email }}
                    </span>
                    <UButton color="gray" variant="ghost" icon="i-heroicons-arrow-right-on-rectangle" size="sm"
                        class="sm:hidden" @click="handleLogout" />
                    <UButton color="gray" variant="ghost" icon="i-heroicons-arrow-right-on-rectangle"
                        class="hidden sm:flex" @click="handleLogout">
                        Sair
                    </UButton>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
            <div v-if="isLoading" class="flex items-center justify-center py-16 sm:py-24">
                <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-violet-500" />
            </div>

            <div v-else-if="user" class="space-y-6 sm:space-y-8">
                <!-- Welcome -->
                <div>
                    <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">
                        Olá, {{ user.name || 'Estudante' }}! 👋
                    </h1>
                    <p class="text-sm sm:text-base text-zinc-400">
                        Bem-vindo ao seu painel de estudos.
                    </p>
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
                                <p class="text-xl sm:text-2xl font-bold">0</p>
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
                                <p class="text-xl sm:text-2xl font-bold">0</p>
                                <p class="text-xs sm:text-sm text-zinc-400">Cards revisados</p>
                            </div>
                        </div>
                    </div>

                    <div
                        class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
                        <div class="flex items-center gap-3 sm:gap-4">
                            <div
                                class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                                <UIcon name="i-heroicons-fire" class="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                            </div>
                            <div class="min-w-0">
                                <p class="text-xl sm:text-2xl font-bold">0</p>
                                <p class="text-xs sm:text-sm text-zinc-400">Dias de streak</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div
                    class="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 p-6 sm:p-8 lg:p-12 text-center">
                    <div
                        class="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <UIcon name="i-heroicons-plus" class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-violet-400" />
                    </div>
                    <h2 class="text-lg sm:text-xl font-bold mb-2">Crie seu primeiro deck</h2>
                    <p class="text-sm sm:text-base text-zinc-400 mb-4 sm:mb-6 max-w-md mx-auto">
                        Faça upload de um PDF ou digite um tema para gerar flashcards automaticamente com IA.
                    </p>
                    <UButton color="violet" size="md" class="sm:hidden">
                        <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-1.5" />
                        Criar Deck
                    </UButton>
                    <UButton color="violet" size="lg" class="hidden sm:inline-flex">
                        <UIcon name="i-heroicons-plus" class="w-5 h-5 mr-2" />
                        Criar Deck
                    </UButton>
                </div>
            </div>
        </main>
    </div>
</template>
