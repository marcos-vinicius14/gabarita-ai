<script setup lang="ts">
/**
 * SocialProof Component
 * 
 * Responsible for: FOMO section with avatars and CTA.
 */

function scrollToTop() {
    if (import.meta.client) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }
}
</script>

<template>
    <section class="border-t border-zinc-800/50">
        <UContainer class="py-20 md:py-28">
            <div class="max-w-2xl mx-auto text-center">
                <!-- Avatar Stack -->
                <div class="inline-flex items-center gap-2 mb-6">
                    <div class="flex -space-x-2">
                        <div
                            class="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-sm font-medium border-2 border-zinc-950">
                            M
                        </div>
                        <div
                            class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-sm font-medium border-2 border-zinc-950">
                            A
                        </div>
                        <div
                            class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-sm font-medium border-2 border-zinc-950">
                            J
                        </div>
                        <div
                            class="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-sm font-medium border-2 border-zinc-950">
                            +
                        </div>
                    </div>
                </div>

                <h2 class="text-2xl md:text-3xl font-bold mb-4">
                    Junte-se a outros estudantes de elite
                    <span class="text-violet-400">aguardando o lançamento.</span>
                </h2>

                <p class="text-zinc-400 mb-8">
                    Garanta acesso antecipado e descontos exclusivos para membros da lista de espera.
                </p>

                <UButton size="lg" color="violet" variant="outline" :ui="{ rounded: 'rounded-xl' }"
                    @click="scrollToTop">
                    <template #leading>
                        <UIcon name="i-heroicons-arrow-up" class="w-5 h-5" />
                    </template>
                    Garantir minha vaga
                </UButton>
            </div>
        </UContainer>
    </section>
</template>
