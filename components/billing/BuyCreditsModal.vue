<script setup lang="ts">
/**
 * Buy Credits Modal
 * 
 * Modal for purchasing credit packages.
 * For now, uses the mock API endpoint.
 */

import { useMutation, useQueryClient } from '@tanstack/vue-query';

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

const packages = [
    { id: 'starter', credits: 5, price: 'R$ 14,90', description: 'Ideal para experimentar' },
    { id: 'standard', credits: 20, price: 'R$ 49,90', description: 'Mais popular', popular: true },
    { id: 'power', credits: 50, price: 'R$ 99,90', description: 'Melhor custo-benefício' },
];

const selectedPackage = ref<string | null>(null);

const purchaseMutation = useMutation({
    mutationFn: async (packageId: string) => {
        const response = await $fetch('/api/billing/credits', {
            method: 'POST',
            body: { packageId },
        });
        return response;
    },
    onSuccess: (data: any) => {
        toast.add({
            title: 'Sucesso!',
            description: data.message,
            color: 'green',
        });
        queryClient.invalidateQueries({ queryKey: ['billing', 'usage'] });
        isOpen.value = false;
        selectedPackage.value = null;
    },
    onError: (error: any) => {
        toast.add({
            title: 'Erro',
            description: error?.data?.message || 'Erro ao processar compra.',
            color: 'red',
        });
    },
});

function handlePurchase() {
    if (!selectedPackage.value) return;
    purchaseMutation.mutate(selectedPackage.value);
}
</script>

<template>
    <UModal v-model:open="isOpen">
        <template #content>
            <div class="p-6">
                <h2 class="text-xl font-bold mb-2">Comprar Créditos</h2>
                <p class="text-sm text-zinc-400 mb-6">
                    Cada crédito permite processar 1 PDF adicional.
                </p>

                <div class="space-y-3 mb-6">
                    <button v-for="pkg in packages" :key="pkg.id" type="button"
                        class="w-full p-4 rounded-xl border transition-all text-left" :class="[
                            selectedPackage === pkg.id
                                ? 'border-violet-500 bg-violet-500/10'
                                : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600',
                            pkg.popular ? 'ring-2 ring-violet-500/50' : ''
                        ]" @click="selectedPackage = pkg.id">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="font-semibold">{{ pkg.credits }} créditos</span>
                                    <span v-if="pkg.popular"
                                        class="text-xs bg-violet-500 text-white px-2 py-0.5 rounded-full">
                                        Popular
                                    </span>
                                </div>
                                <span class="text-sm text-zinc-400">{{ pkg.description }}</span>
                            </div>
                            <span class="text-lg font-bold text-violet-400">{{ pkg.price }}</span>
                        </div>
                    </button>
                </div>

                <div class="flex gap-3">
                    <UButton color="gray" variant="ghost" class="flex-1" @click="isOpen = false">
                        Cancelar
                    </UButton>
                    <UButton color="violet" class="flex-1" :disabled="!selectedPackage"
                        :loading="purchaseMutation.isPending.value" @click="handlePurchase">
                        Comprar
                    </UButton>
                </div>

                <p class="text-xs text-zinc-500 text-center mt-4">
                    Pagamento seguro via Stripe (em breve)
                </p>
            </div>
        </template>
    </UModal>
</template>
