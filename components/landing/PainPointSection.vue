<script setup lang="ts">
/**
 * PainPointSection Component
 * 
 * Responsible for: Displaying the pain point statistics.
 * Static presentation component.
 */

interface Stat {
    value: string
    label: string
    color: string
}

const stats: Stat[] = [
    { value: '10%', label: 'Retenção com leitura passiva', color: 'text-red-400' },
    { value: '+3h', label: 'Para criar cards no Anki', color: 'text-amber-400' },
    { value: '90%', label: 'Retenção com Gabarita.ai', color: 'text-emerald-400' },
]
</script>

<template>
    <section class="border-t border-zinc-800/50">
        <UContainer class="py-20 md:py-28">
            <div class="max-w-3xl mx-auto text-center">
                <h2 class="text-3xl md:text-4xl font-bold mb-6">
                    Você tem <span class="text-violet-400">50 PDFs</span> para ler e
                    <span class="text-red-400">zero tempo.</span>
                </h2>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                    <div v-for="stat in stats" :key="stat.label"
                        class="group p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all duration-300">
                        <div :class="['text-4xl font-bold mb-2', stat.color]">{{ stat.value }}</div>
                        <p class="text-zinc-400">{{ stat.label }}</p>
                    </div>
                </div>

                <p class="mt-10 text-lg text-zinc-400">
                    Ler passivamente não funciona. Criar cards leva horas.
                    <span class="text-white font-medium">O Gabarita.ai resolve isso.</span>
                </p>
            </div>
        </UContainer>
    </section>
</template>
