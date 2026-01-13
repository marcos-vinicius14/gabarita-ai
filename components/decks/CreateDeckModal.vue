<script setup lang="ts">
/**
 * CreateDeckModal
 * 
 * Responsible for: Modal form to create a new deck via PDF upload.
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

const { uploadNewDeck, uploadMutation } = useDecks();

const selectedFile = ref<File | null>(null);
const selectedBankStyle = ref('general');
const fileError = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
});

const isSubmitting = computed(() => uploadMutation.isPending.value);

const isUploadValid = computed(() => {
    return selectedFile.value !== null;
});

const fileName = computed(() => selectedFile.value?.name ?? '');

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

async function handleSubmit() {
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
        // Error is handled by mutation onError callback
    }
}

function resetForm() {
    selectedFile.value = null;
    selectedBankStyle.value = 'general';
    fileError.value = null;
}

function handleClose() {
    resetForm();
    isOpen.value = false;
}
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
                <!-- File Input -->
                <UFormGroup label="Arquivo PDF" name="file" :error="fileError ?? undefined" required>
                    <div class="relative border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center 
                               hover:border-violet-500/50 transition-colors cursor-pointer"
                        :class="{ 'border-violet-500 bg-violet-500/10': selectedFile }" @click="fileInputRef?.click()">
                        <input ref="fileInputRef" type="file" accept=".pdf,application/pdf" class="hidden"
                            @change="handleFileChange" />

                        <div v-if="!selectedFile" class="space-y-2">
                            <UIcon name="i-heroicons-cloud-arrow-up" class="w-10 h-10 text-zinc-500 mx-auto" />
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
                    <USelect v-model="selectedBankStyle" :options="bankStyleOptions" option-attribute="label"
                        value-attribute="value" size="lg" :disabled="isSubmitting" />
                </UFormGroup>

                <div class="bg-violet-500/10 rounded-lg p-3 flex items-start gap-3 border border-violet-500/20">
                    <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                    <div class="text-sm text-zinc-300">
                        <p class="font-medium text-violet-300 mb-1">IA processará seu PDF</p>
                        <p class="text-zinc-400">
                            Extrairemos o texto e geraremos flashcards automaticamente.
                            Isso pode levar alguns minutos.
                        </p>
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-3">
                    <UButton color="gray" variant="ghost" :disabled="isSubmitting" @click="handleClose">
                        Cancelar
                    </UButton>
                    <UButton color="violet" :loading="uploadMutation.isPending.value"
                        :disabled="!isUploadValid || isSubmitting" @click="handleSubmit">
                        <UIcon v-if="!uploadMutation.isPending.value" name="i-heroicons-cloud-arrow-up"
                            class="w-4 h-4 mr-1.5" />
                        {{ uploadMutation.isPending.value ? 'Enviando & Lendo...' : 'Enviar PDF' }}
                    </UButton>
                </div>
            </template>
        </UCard>
    </UModal>
</template>
