<script setup lang="ts">
/**
 * Upgrade Plans Modal
 * 
 * Modal for subscribing to Pro plans or buying credits.
 */

import { useMutation, useQueryClient, useQuery } from '@tanstack/vue-query';
import { type MutationError, getApiErrorMessage } from '~/types/errors';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const toast = useToast();
const queryClient = useQueryClient();

const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

// Fetch plans
const { data: plansResponse } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: async () => {
        return await $fetch('/api/billing/plans');
    },
});

const plans = computed(() => (plansResponse.value as any)?.data?.subscriptions ?? []);

const selectedTab = ref<'subscription' | 'credits'>('subscription');
const selectedPlan = ref<string | null>(null);

const subscribeMutation = useMutation({
    mutationFn: async (planId: string) => {
        const response = await $fetch<{ message: string }>('/api/billing/subscribe', {
            method: 'POST',
            body: { planId },
        });
        return response;
    },
    onSuccess: (data) => {
        toast.add({
            title: 'Sucesso!',
            description: data.message,
            color: 'green',
        });
        queryClient.invalidateQueries({ queryKey: ['billing'] });
        queryClient.invalidateQueries({ queryKey: ['auth'] });
        isOpen.value = false;
        selectedPlan.value = null;
    },
    onError: (error: MutationError) => {
        toast.add({
            title: 'Erro',
            description: getApiErrorMessage(error, 'Erro ao processar assinatura.'),
            color: 'red',
        });
    },
});

function handleSubscribe() {
    if (!selectedPlan.value) return;
    subscribeMutation.mutate(selectedPlan.value);
}

function formatPrice(priceStr: string) {
    return `R$ ${priceStr}`;
}
</script>

<template>
    <UModal v-model="isOpen" :ui="{ width: 'max-w-2xl' }">
        <UCard class="bg-zinc-900 border-zinc-800">
            <template #header>
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-2xl font-bold">Upgrade para Pro</h2>
                        <p class="text-sm text-zinc-400">
                            Desbloqueie uploads ilimitados e todos os recursos premium.
                        </p>
                    </div>
                    <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="isOpen = false" />
                </div>
            </template>

            <!-- Plan Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button v-for="plan in plans" :key="plan.id" type="button"
                    class="relative p-5 rounded-xl border transition-all text-left" :class="[
                        selectedPlan === plan.id
                            ? 'border-violet-500 bg-violet-500/10'
                            : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600',
                    ]" @click="selectedPlan = plan.id">
                    <!-- Popular Badge -->
                    <div v-if="plan.savings" class="absolute -top-3 left-4">
                        <span
                            class="text-xs bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-3 py-1 rounded-full font-medium">
                            {{ plan.savings }}
                        </span>
                    </div>

                    <div class="mb-3">
                        <h3 class="font-semibold text-lg">{{ plan.name }}</h3>
                        <div class="flex items-baseline gap-1 mt-1">
                            <span class="text-2xl font-bold text-violet-400">{{ formatPrice(plan.price) }}</span>
                            <span class="text-sm text-zinc-500">/{{ plan.interval === 'month' ? 'mês' : 'ano'
                                }}</span>
                        </div>
                    </div>

                    <ul class="space-y-2">
                        <li v-for="feature in plan.features" :key="feature" class="flex items-center gap-2 text-sm">
                            <UIcon name="i-heroicons-check" class="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span class="text-zinc-300">{{ feature }}</span>
                        </li>
                    </ul>
                </button>
            </div>

            <p class="text-xs text-zinc-500 text-center mb-4">
                Pagamento seguro via Stripe. Cancele a qualquer momento.
            </p>

            <template #footer>
                <div class="flex gap-3">
                    <UButton color="gray" variant="ghost" class="flex-1" @click="isOpen = false">
                        Cancelar
                    </UButton>
                    <UButton color="violet" class="flex-1" :disabled="!selectedPlan"
                        :loading="subscribeMutation.isPending.value" @click="handleSubscribe">
                        <UIcon name="i-heroicons-credit-card" class="w-4 h-4 mr-1.5" />
                        Assinar Agora
                    </UButton>
                </div>
            </template>
        </UCard>
    </UModal>
</template>
