<script setup lang="ts">
/**
 * DeleteDeckModal
 * 
 * Responsible for: Confirmation modal before deleting a deck.
 */

import { useDecks } from '~/composables/useDecks';
import type { DeckItem } from '~/types/decks';

// Props & Emits
interface Props {
    modelValue: boolean;
    deck: DeckItem | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'deleted'): void;
}>();

// Composables
const { removeDeck, deleteMutation } = useDecks();

// Computed
const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
});

const isDeleting = computed(() => deleteMutation.isPending.value);

// Functions
async function handleConfirm() {
    if (!props.deck) {
        return;
    }

    try {
        const result = await removeDeck(props.deck.id);

        if (result.success) {
            isOpen.value = false;
            emit('deleted');
        }
    } catch {
        // Error is handled by mutation onError callback
    }
}

function handleCancel() {
    isOpen.value = false;
}
</script>

<template>
    <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-md' }">
        <UCard class="bg-zinc-900 border-zinc-800">
            <template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-white">Excluir Deck</h3>
                        <p class="text-sm text-zinc-400">Esta ação não pode ser desfeita</p>
                    </div>
                </div>
            </template>

            <div class="space-y-4">
                <p class="text-zinc-300">
                    Tem certeza que deseja excluir o deck
                    <strong class="text-white">"{{ deck?.topic }}"</strong>?
                </p>
                <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                    <div class="flex items-center gap-2 text-sm text-zinc-400">
                        <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4 text-amber-400" />
                        <span>Todos os <strong class="text-white">{{ deck?.cardCount ?? 0 }} cards</strong> serão
                            excluídos
                            permanentemente.</span>
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <UButton color="gray" variant="ghost" :disabled="isDeleting" @click="handleCancel">
                        Cancelar
                    </UButton>
                    <UButton color="red" :loading="isDeleting" :disabled="isDeleting" @click="handleConfirm">
                        <UIcon name="i-heroicons-trash" class="w-4 h-4 mr-1.5" />
                        Excluir
                    </UButton>
                </div>
            </template>
        </UCard>
    </UModal>
</template>
