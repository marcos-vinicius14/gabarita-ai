<script setup lang="ts">
/**
 * Register Page
 *
 * Responsible for: SEO metadata and page composition.
 */

definePageMeta({
    layout: false,
})

useSeoMeta({
    title: 'Criar Conta | Gabarita.ai',
    description: 'Crie sua conta gratuita no Gabarita.ai',
})
</script>

<template>
    <div class="min-h-screen bg-zinc-950 flex items-center justify-center p-4 py-12">
        <div class="fixed inset-0 pointer-events-none">
            <div
                class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-500/10 rounded-full blur-3xl" />
        </div>
        <div class="relative w-full max-w-md">
            <div class="text-center mb-8">
                <NuxtLink to="/" class="inline-flex items-center gap-2">
                    <div
                        class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                        <UIcon name="i-heroicons-sparkles" class="w-6 h-6 text-white" />
                    </div>
                    <span class="text-2xl font-bold text-white">Gabarita.ai</span>
                </NuxtLink>
            </div>
            <AuthRegisterForm />
        </div>
    </div>
</template>
