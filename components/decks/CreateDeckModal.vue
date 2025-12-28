<script setup lang="ts">
/**
 * CreateDeckModal
 * 
 * Responsible for: Modal form to create a new deck (manual or PDF upload).
 */

import { useDecks } from '~/composables/useDecks';
import { BANK_STYLE_OPTIONS } from '~/types/decks';

// Create mutable copy for USelect (which doesn't accept readonly arrays)
const bankStyleOptions = [...BANK_STYLE_OPTIONS];

// Props & Emits
interface Props {
    modelValue: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'created'): void;
}>();

const { createNewDeck, uploadNewDeck, createMutation, uploadMutation } = useDecks();

const activeTab = ref(0);
const tabs = [
    { label: 'Manual', icon: 'i-heroicons-pencil-square' },
    { label: 'Upload PDF', icon: 'i-heroicons-document-arrow-up' },
];

const topic = ref('');
const topicError = ref<string | null>(null);

const selectedFile = ref<File | null>(null);
const selectedBankStyle = ref('general');
const fileError = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
});

const isSubmitting = computed(() =>
    createMutation.isPending.value || uploadMutation.isPending.value
);

const isManualValid = computed(() => {
    const trimmed = topic.value.trim();
    return trimmed.length >= 3 && trimmed.length <= 100;
});

const isUploadValid = computed(() => {
    return selectedFile.value !== null;
});

const fileName = computed(() => selectedFile.value?.name ?? '');

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

function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) {
        selectedFile.value = null;
        fileError.value = null;
        return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
        selectedFile.value = null;
        fileError.value = 'Apenas arquivos PDF são permitidos.';
        return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        selectedFile.value = null;
        fileError.value = 'O arquivo deve ter no máximo 50MB.';
        return;
    }

    selectedFile.value = file;
    fileError.value = null;
}

function clearFile() {
    selectedFile.value = null;
    fileError.value = null;
    if (fileInputRef.value) {
        fileInputRef.value.value = '';
    }
}

async function handleManualSubmit() {
    if (!validateTopic()) {
        return;
    }

    try {
        const result = await createNewDeck({ topic: topic.value.trim() });

        if (result.success) {
            resetForm();
            isOpen.value = false;
            emit('created');
        }
    } catch {
        // Error is handled by mutation onError callback
    }
}

async function handleUploadSubmit() {
    if (!selectedFile.value) {
        fileError.value = 'Selecione um arquivo PDF.';
        return;
    }

    try {
        const result = await uploadNewDeck(selectedFile.value, selectedBankStyle.value);

        if (result.success) {
            resetForm();
            isOpen.value = false;
            emit('created');
        }
    } catch {
    }
}

function handleSubmit() {
    if (activeTab.value === 0) {
        handleManualSubmit();
    } else {
        handleUploadSubmit();
    }
}

function resetForm() {
    topic.value = '';
    topicError.value = null;
    selectedFile.value = null;
    selectedBankStyle.value = 'general';
    fileError.value = null;
    activeTab.value = 0;
}

function handleClose() {
    resetForm();
    isOpen.value = false;
}

watch(topic, () => {
    if (topicError.value) {
        topicError.value = null;
    }
});
</script>

<template>
    <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-lg' }">
        <UCard class="bg-zinc-900 border-zinc-800">
            <template #header>
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-white">Criar Novo Deck</h3>
                    <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="handleClose" />
                </div>
            </template>

            <div class="space-y-5">
                <!-- Tabs -->
                <UTabs v-model="activeTab" :items="tabs" :ui="{
                    list: {
                        background: 'bg-zinc-800',
                        marker: {
                            background: 'bg-violet-600',
                        },
                        tab: {
                            active: 'text-white',
                            inactive: 'text-zinc-400',
                        },
                    },
                }">
                    <!-- Manual Tab -->
                    <template #item="{ item, index }">
                        <div v-if="index === 0" class="pt-4 space-y-4">
                            <UFormGroup label="Tema do Deck" name="topic"
                                help="Ex: Direito Constitucional, Biologia Celular, React Hooks..."
                                :error="topicError ?? undefined" required>
                                <UInput v-model="topic" placeholder="Digite o tema do seu deck" size="lg"
                                    :disabled="isSubmitting" autofocus @blur="validateTopic" />
                            </UFormGroup>

                            <div class="bg-zinc-800/50 rounded-lg p-3 flex items-start gap-3">
                                <UIcon name="i-heroicons-light-bulb"
                                    class="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                <p class="text-sm text-zinc-400">
                                    A IA vai gerar flashcards automaticamente baseado no tema.
                                    Quanto mais específico, melhores os cards!
                                </p>
                            </div>
                        </div>

                        <!-- Upload Tab -->
                        <div v-else-if="index === 1" class="pt-4 space-y-4">
                            <!-- File Input -->
                            <UFormGroup label="Arquivo PDF" name="file" :error="fileError ?? undefined" required>
                                <div class="relative border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center 
                                           hover:border-violet-500/50 transition-colors cursor-pointer"
                                    :class="{ 'border-violet-500 bg-violet-500/10': selectedFile }"
                                    @click="fileInputRef?.click()">
                                    <input ref="fileInputRef" type="file" accept=".pdf,application/pdf" class="hidden"
                                        @change="handleFileChange" />

                                    <div v-if="!selectedFile" class="space-y-2">
                                        <UIcon name="i-heroicons-cloud-arrow-up"
                                            class="w-10 h-10 text-zinc-500 mx-auto" />
                                        <p class="text-sm text-zinc-400">
                                            Clique para selecionar ou arraste um PDF
                                        </p>
                                        <p class="text-xs text-zinc-500">
                                            Máximo 50MB
                                        </p>
                                    </div>

                                    <div v-else class="flex items-center justify-center gap-3">
                                        <UIcon name="i-heroicons-document-text" class="w-8 h-8 text-violet-400" />
                                        <div class="text-left">
                                            <p class="text-sm font-medium text-white truncate max-w-[200px]">
                                                {{ fileName }}
                                            </p>
                                            <p class="text-xs text-zinc-400">
                                                {{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB
                                            </p>
                                        </div>
                                        <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" size="xs"
                                            @click.stop="clearFile" />
                                    </div>
                                </div>
                            </UFormGroup>

                            <!-- Bank Style Selector -->
                            <UFormGroup label="Estilo da Banca" name="bankStyle"
                                help="Escolha o estilo de questões para gerar os flashcards.">
                                <USelect v-model="selectedBankStyle" :options="bankStyleOptions"
                                    option-attribute="label" value-attribute="value" size="lg"
                                    :disabled="isSubmitting" />
                            </UFormGroup>

                            <div
                                class="bg-violet-500/10 rounded-lg p-3 flex items-start gap-3 border border-violet-500/20">
                                <UIcon name="i-heroicons-sparkles"
                                    class="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                                <div class="text-sm text-zinc-300">
                                    <p class="font-medium text-violet-300 mb-1">IA processará seu PDF</p>
                                    <p class="text-zinc-400">
                                        Extrairemos o texto e geraremos flashcards automaticamente.
                                        Isso pode levar alguns minutos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </template>
                </UTabs>
            </div>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <UButton color="gray" variant="ghost" :disabled="isSubmitting" @click="handleClose">
                        Cancelar
                    </UButton>
                    <UButton v-if="activeTab === 0" color="violet" :loading="createMutation.isPending.value"
                        :disabled="!isManualValid || isSubmitting" @click="handleSubmit">
                        <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-1.5" />
                        Criar Deck
                    </UButton>
                    <UButton v-else color="violet" :loading="uploadMutation.isPending.value"
                        :disabled="!isUploadValid || isSubmitting" @click="handleSubmit">
                        <template v-if="uploadMutation.isPending.value">
                            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-1.5 animate-spin" />
                            Enviando & Lendo...
                        </template>
                        <template v-else>
                            <UIcon name="i-heroicons-cloud-arrow-up" class="w-4 h-4 mr-1.5" />
                            Enviar PDF
                        </template>
                    </UButton>
                </div>
            </template>
        </UCard>
    </UModal>
</template>
