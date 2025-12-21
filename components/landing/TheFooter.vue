<script setup lang="ts">
/**
 * TheFooter Component
 * 
 * Responsible for: Footer content with branding and copyright.
 */

const currentYear = new Date().getFullYear()
</script>

<template>
    <footer class="border-t border-zinc-800/50 py-8">
        <UContainer>
            <div class="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
                <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-academic-cap" class="w-5 h-5 text-violet-400" />
                    <span class="font-semibold text-white">Gabarita.ai</span>
                </div>
                <p>© {{ currentYear }} Gabarita.ai. Todos os direitos reservados.</p>
            </div>
        </UContainer>
    </footer>
</template>
