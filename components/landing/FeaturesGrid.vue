<script setup lang="ts">
/**
 * FeaturesGrid Component
 * 
 * Responsible for: Displaying the 3 feature cards.
 * Static presentation component.
 */

interface Feature {
    icon: string
    title: string
    description: string
}

const features: Feature[] = [
    {
        icon: 'i-heroicons-document-magnifying-glass',
        title: 'RAG Inteligente',
        description: 'Extração de conceitos com IA generativa. Seus PDFs de Lei Seca viram flashcards em segundos.',
    },
    {
        icon: 'i-heroicons-scale',
        title: 'Correção Semântica',
        description: 'Juiz implacável que verifica precisão jurídica das suas respostas, não apenas palavras-chave.',
    },
    {
        icon: 'i-heroicons-arrow-path',
        title: 'Repetição Espaçada',
        description: 'Algoritmo científico agenda suas revisões no momento ideal para máxima retenção na memória.',
    },
]
</script>

<template>
    <section class="border-t border-zinc-800/50 bg-zinc-900/30">
        <UContainer class="py-20 md:py-28">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-bold mb-4">
                    Como funciona
                </h2>
                <p class="text-zinc-400 text-lg">
                    Três passos para transformar sua rotina de estudos
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div v-for="(feature, index) in features" :key="index"
                    class="group relative p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300">
                    <!-- Feature Number -->
                    <div
                        class="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-sm font-bold shadow-lg shadow-violet-500/20">
                        {{ index + 1 }}
                    </div>

                    <!-- Icon -->
                    <div
                        class="w-14 h-14 rounded-xl bg-violet-500/10 flex items-center justify-center mb-6 group-hover:bg-violet-500/20 group-hover:scale-105 transition-all duration-300">
                        <UIcon :name="feature.icon" class="w-7 h-7 text-violet-400" />
                    </div>

                    <!-- Content -->
                    <h3 class="text-xl font-semibold mb-3 group-hover:text-violet-300 transition-colors">
                        {{ feature.title }}
                    </h3>
                    <p class="text-zinc-400 leading-relaxed">{{ feature.description }}</p>
                </div>
            </div>
        </UContainer>
    </section>
</template>
