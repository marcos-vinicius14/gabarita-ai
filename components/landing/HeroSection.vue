<script setup lang="ts">
/**
 * HeroSection Component
 * 
 * Responsible for: Main headline, subheadline, and waitlist form.
 * Uses useWaitlistStore for form state and submission.
 */
import { useWaitlistStore } from '~/stores/waitlist'

const toast = useToast()
const waitlistStore = useWaitlistStore()

async function handleSubmit() {
    const result = await waitlistStore.joinWaitlist()

    if (!result.success) {
        toast.add({
            title: result.message.includes('inválido') ? 'Email inválido' : 'Ops!',
            description: result.message,
            icon: result.message.includes('inválido')
                ? 'i-heroicons-exclamation-circle'
                : 'i-heroicons-exclamation-triangle',
            color: result.message.includes('inválido') ? 'red' : 'yellow',
        })
        return
    }

    toast.add({
        title: 'Você está na lista! 🎉',
        description: result.message,
        icon: 'i-heroicons-check-circle',
        color: 'green',
    })
}

// Local email state that syncs with store
const localEmail = ref('')

watch(localEmail, (value) => {
    waitlistStore.setEmail(value)
})

// Clear local email when store email is cleared (after success)
watch(() => waitlistStore.email, (value) => {
    if (value === '') {
        localEmail.value = ''
    }
})
</script>

<template>
    <section class="relative overflow-hidden">
        <!-- Gradient Background -->
        <div class="absolute inset-0 bg-gradient-to-b from-violet-950/20 to-transparent pointer-events-none" />

        <!-- Decorative Blobs -->
        <div class="absolute top-20 left-10 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div class="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

        <UContainer class="relative py-24 md:py-32 lg:py-40">
            <div class="max-w-4xl mx-auto text-center">
                <!-- Headline -->
                <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                    Pare de resumir.
                    <span class="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">
                        Comece a gabaritar.
                    </span>
                </h1>

                <!-- Subheadline -->
                <p class="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12">
                    A primeira IA que transforma seus PDFs de Lei Seca e Doutrina em Flashcards de revisão ativa.
                    <span class="text-violet-400 font-medium">Seu novo Coach de aprovação.</span>
                </p>

                <!-- Waitlist Form -->
                <form @submit.prevent="handleSubmit" class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                    <UInput v-model="localEmail" type="email" placeholder="seu@email.com" size="lg"
                        :disabled="waitlistStore.loading" :ui="{
                            base: 'flex-1',
                            rounded: 'rounded-xl',
                            color: {
                                white: {
                                    outline: 'bg-zinc-900 ring-zinc-800 focus:ring-violet-500'
                                }
                            }
                        }" class="flex-1" />
                    <UButton type="submit" size="lg" color="violet" :loading="waitlistStore.loading"
                        :ui="{ rounded: 'rounded-xl' }">
                        <template #leading>
                            <UIcon v-if="!waitlistStore.loading" name="i-heroicons-bolt" class="w-5 h-5" />
                        </template>
                        {{ waitlistStore.loading ? 'Entrando...' : 'Entrar na Lista' }}
                    </UButton>
                </form>

                <!-- Trust Text -->
                <p class="mt-6 text-sm text-zinc-500">
                    🔒 Sem spam. Cancelamento a qualquer momento.
                </p>
            </div>
        </UContainer>
    </section>
</template>
