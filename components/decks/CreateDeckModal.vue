<script setup lang="ts">
/**
 * CreateDeckModal
 * 
 * Responsible for: Modal form to create a new deck.
 */

import { useDecks } from '~/composables/useDecks';

// Props & Emits
interface Props {
    modelValue: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'created'): void;
}>();

// Composables
const { createNewDeck, createMutation } = useDecks();

// Local State
const topic = ref('');
const topicError = ref<string | null>(null);

// Computed
const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
});

const isSubmitting = computed(() => createMutation.isPending.value);

const isValid = computed(() => {
    const trimmed = topic.value.trim();
    return trimmed.length >= 3 && trimmed.length <= 100;
});

// Functions
function validateTopic() {
    const trimmed = topic.value.trim();

    if (!trimmed) {
        topicError.value = 'O tema é obrigatório.';
        return false;
    }

    if (trimmed.length < 3) {
        topicError.value = 'O tema deve ter pelo menos 3 caracteres.';
        return false;
    }

    if (trimmed.length > 100) {
        topicError.value = 'O tema deve ter no máximo 100 caracteres.';
        return false;
    }

    topicError.value = null;
    return true;
}

async function handleSubmit() {
    if (!validateTopic()) {
        return;
    }

    try {
        const result = await createNewDeck({ topic: topic.value.trim() });

        if (result.success) {
            topic.value = '';
            topicError.value = null;
            isOpen.value = false;
            emit('created');
        }
    } catch {
        // Error is handled by mutation onError callback
    }
}

function handleClose() {
    topic.value = '';
    topicError.value = null;
    isOpen.value = false;
}

// Watch for input changes to clear error
watch(topic, () => {
    if (topicError.value) {
        topicError.value = null;
    }
});
</script>

<template>
    <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-md' }">
        <UCard class="bg-zinc-900 border-zinc-800">
            <template #header>
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-white">Criar Novo Deck</h3>
                    <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="handleClose" />
                </div>
            </template>

            <form @submit.prevent="handleSubmit" class="space-y-4">
                <UFormGroup label="Tema do Deck" name="topic"
                    help="Ex: Direito Constitucional, Biologia Celular, React Hooks..." :error="topicError ?? undefined"
                    required>
                    <UInput v-model="topic" placeholder="Digite o tema do seu deck" size="lg" :disabled="isSubmitting"
                        autofocus @blur="validateTopic" />
                </UFormGroup>
            </form>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <UButton color="gray" variant="ghost" :disabled="isSubmitting" @click="handleClose">
                        Cancelar
                    </UButton>
                    <UButton color="violet" :loading="isSubmitting" :disabled="!isValid || isSubmitting"
                        @click="handleSubmit">
                        <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-1.5" />
                        Criar Deck
                    </UButton>
                </div>
            </template>
        </UCard>
    </UModal>
</template>
