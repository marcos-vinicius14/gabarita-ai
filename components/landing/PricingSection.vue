<script setup lang="ts">
/**
 * Pricing Section
 * 
 * Displays subscription plans and credit packages for the landing page.
 */

const router = useRouter();

const plans = [
    {
        id: 'free',
        name: 'Grátis',
        price: '0',
        period: '',
        description: 'Para experimentar',
        features: [
            '1 upload de PDF/mês',
            '3 decks ativos',
            'Revisão com algoritmo FSRS',
            'Funciona offline',
        ],
        cta: 'Começar Grátis',
        popular: false,
        color: 'zinc',
    },
    {
        id: 'pro_monthly',
        name: 'Pro Mensal',
        price: '29,90',
        period: '/mês',
        description: 'Para quem estuda todo dia',
        features: [
            'Uploads ilimitados',
            'Decks ilimitados',
            'Todos os estilos de banca',
            'Suporte prioritário',
            'Estatísticas avançadas',
        ],
        cta: 'Assinar Agora',
        popular: true,
        color: 'violet',
    },
    {
        id: 'pro_annual',
        name: 'Pro Anual',
        price: '239,90',
        period: '/ano',
        description: '2 meses grátis',
        features: [
            'Tudo do Pro Mensal',
            '33% de desconto',
            'Acesso antecipado a features',
            'Cancele a qualquer momento',
        ],
        cta: 'Assinar Anual',
        popular: false,
        color: 'violet',
        savings: 'Economize R$ 119',
    },
];

const creditPackages = [
    { credits: 5, price: '14,90', perCredit: '2,98' },
    { credits: 20, price: '49,90', perCredit: '2,50' },
    { credits: 50, price: '99,90', perCredit: '2,00' },
];

function handleCta(planId: string) {
    router.push('/register');
}
</script>

<template>
    <section id="pricing" class="py-20 sm:py-28 bg-zinc-900/50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <!-- Header -->
            <div class="text-center mb-12 sm:mb-16">
                <span class="inline-flex items-center gap-2 text-violet-400 text-sm font-medium mb-4">
                    <UIcon name="i-heroicons-tag" class="w-4 h-4" />
                    Preços
                </span>
                <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                    Escolha seu plano
                </h2>
                <p class="text-zinc-400 text-lg max-w-2xl mx-auto">
                    Comece grátis ou escolha o plano ideal para seus estudos.
                    Sem compromisso, cancele quando quiser.
                </p>
            </div>

            <!-- Subscription Plans -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16">
                <div v-for="plan in plans" :key="plan.id"
                    class="relative rounded-2xl border p-6 lg:p-8 transition-all duration-300" :class="[
                        plan.popular
                            ? 'border-violet-500 bg-gradient-to-b from-violet-500/10 to-transparent scale-105 shadow-xl shadow-violet-500/20'
                            : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700'
                    ]">
                    <!-- Popular Badge -->
                    <div v-if="plan.popular" class="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span
                            class="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium px-4 py-1.5 rounded-full">
                            Mais Popular
                        </span>
                    </div>

                    <!-- Savings Badge -->
                    <div v-if="plan.savings" class="absolute -top-4 right-4">
                        <span class="bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                            {{ plan.savings }}
                        </span>
                    </div>

                    <div class="mb-6">
                        <h3 class="text-xl font-bold mb-1">{{ plan.name }}</h3>
                        <p class="text-sm text-zinc-400">{{ plan.description }}</p>
                    </div>

                    <div class="mb-6">
                        <span class="text-4xl lg:text-5xl font-bold">
                            R$ {{ plan.price }}
                        </span>
                        <span v-if="plan.period" class="text-zinc-400">{{ plan.period }}</span>
                    </div>

                    <ul class="space-y-3 mb-8">
                        <li v-for="feature in plan.features" :key="feature" class="flex items-center gap-3">
                            <div
                                class="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                                <UIcon name="i-heroicons-check" class="w-3 h-3 text-violet-400" />
                            </div>
                            <span class="text-sm text-zinc-300">{{ feature }}</span>
                        </li>
                    </ul>

                    <UButton :color="plan.popular ? 'violet' : 'gray'" :variant="plan.popular ? 'solid' : 'outline'"
                        size="lg" block @click="handleCta(plan.id)">
                        {{ plan.cta }}
                    </UButton>
                </div>
            </div>

            <!-- Credits Section -->
            <div class="max-w-3xl mx-auto">
                <div class="text-center mb-8">
                    <h3 class="text-2xl font-bold mb-2">Prefere pagar por uso?</h3>
                    <p class="text-zinc-400">
                        Compre créditos avulsos para processar PDFs quando precisar.
                        Ideal para quem estuda ocasionalmente.
                    </p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div v-for="pkg in creditPackages" :key="pkg.credits"
                        class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center hover:border-zinc-700 transition-colors">
                        <div class="text-3xl font-bold text-violet-400 mb-1">{{ pkg.credits }}</div>
                        <div class="text-sm text-zinc-400 mb-3">créditos</div>
                        <div class="text-xl font-semibold mb-1">R$ {{ pkg.price }}</div>
                        <div class="text-xs text-zinc-500">R$ {{ pkg.perCredit }} por PDF</div>
                    </div>
                </div>

                <p class="text-center text-sm text-zinc-500 mt-6">
                    1 crédito = 1 upload de PDF processado com IA
                </p>
            </div>
        </div>
    </section>
</template>
