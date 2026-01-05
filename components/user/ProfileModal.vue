<script setup lang="ts">
/**
 * User Profile Modal
 * 
 * Modal showing user stats and profile options.
 */

import { useUsage } from '~/composables/useUsage';

const props = defineProps<{
    open: boolean;
    user: {
        email: string;
        name?: string | null;
        role: string;
    };
}>();

const emit = defineEmits<{
    'update:open': [value: boolean];
    logout: [];
    upgrade: [];
}>();

const isOpen = computed({
    get: () => props.open,
    set: (value: boolean) => emit('update:open', value),
});

const { usage, isLoading } = useUsage();

const planLabels: Record<string, string> = {
    free: 'Gratuito',
    pro: 'Pro',
    admin: 'Admin',
};

const planColors: Record<string, string> = {
    free: 'text-zinc-400',
    pro: 'text-violet-400',
    admin: 'text-yellow-400',
};

const currentPlan = computed(() => usage.value?.plan ?? props.user.role);
const planLabel = computed(() => planLabels[currentPlan.value] ?? 'Gratuito');
const planColor = computed(() => planColors[currentPlan.value] ?? 'text-zinc-400');

const userName = computed(() => {
    if (props.user.name) return props.user.name;
    return props.user.email.split('@')[0];
});

const initials = computed(() => {
    const name = userName.value;
    return name.substring(0, 2).toUpperCase();
});

function handleLogout() {
    isOpen.value = false;
    emit('logout');
}

function handleUpgrade() {
    isOpen.value = false;
    emit('upgrade');
}
</script>

<template>
    <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-md' }">
        <UCard class="bg-zinc-900 border-zinc-800">
            <template #header>
                <div class="flex items-center gap-4">
                    <div
                        class="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                        <span class="text-lg font-bold text-white">{{ initials }}</span>
                    </div>
                    <div class="flex-1">
                        <h2 class="text-xl font-bold">{{ userName }}</h2>
                        <p class="text-sm text-zinc-400">{{ user.email }}</p>
                    </div>
                    <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="isOpen = false" />
                </div>
            </template>

            <!-- Stats -->
            <div class="bg-zinc-800/50 rounded-xl p-4 mb-6">
                <h3 class="text-xs text-zinc-500 uppercase tracking-wide mb-3">Seu Uso</h3>

                <div v-if="isLoading" class="flex items-center justify-center py-6">
                    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-violet-500" />
                </div>

                <div v-else-if="usage" class="space-y-4">
                    <!-- Plan -->
                    <div class="flex items-center justify-between">
                        <span class="text-zinc-400">Plano</span>
                        <span class="font-semibold" :class="planColor">{{ planLabel }}</span>
                    </div>

                    <!-- Uploads -->
                    <div class="flex items-center justify-between">
                        <span class="text-zinc-400">Uploads este mês</span>
                        <span class="font-semibold">
                            {{ usage.monthlyUploads.used }}/{{ usage.monthlyUploads.limit === Infinity ? '∞' :
                                usage.monthlyUploads.limit }}
                        </span>
                    </div>

                    <!-- Decks -->
                    <div class="flex items-center justify-between">
                        <span class="text-zinc-400">Decks ativos</span>
                        <span class="font-semibold">
                            {{ usage.decks.used }}/{{ usage.decks.limit === Infinity ? '∞' : usage.decks.limit }}
                        </span>
                    </div>

                    <!-- Credits -->
                    <div class="flex items-center justify-between">
                        <span class="text-zinc-400">Créditos</span>
                        <span class="font-semibold text-blue-400">{{ usage.credits }}</span>
                    </div>

                    <!-- Subscription End Date -->
                    <div v-if="usage.subscription?.endsAt" class="flex items-center justify-between">
                        <span class="text-zinc-400">
                            {{ usage.subscription.status === 'canceled' ? 'Acesso até' : 'Renova em' }}
                        </span>
                        <span class="font-semibold">
                            {{ new Date(usage.subscription.endsAt).toLocaleDateString('pt-BR') }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Upgrade CTA -->
            <div v-if="currentPlan === 'free'" class="mb-6">
                <button type="button"
                    class="w-full px-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
                    @click="handleUpgrade">
                    <UIcon name="i-heroicons-rocket-launch" class="w-5 h-5 mr-2 inline" />
                    Fazer Upgrade para Pro
                </button>
            </div>

            <template #footer>
                <div class="flex gap-3">
                    <UButton color="gray" variant="ghost" class="flex-1" @click="isOpen = false">
                        Fechar
                    </UButton>
                    <UButton color="red" variant="soft" class="flex-1" @click="handleLogout">
                        <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-4 h-4 mr-1.5" />
                        Sair
                    </UButton>
                </div>
            </template>
        </UCard>
    </UModal>
</template>
