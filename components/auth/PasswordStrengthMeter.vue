<script setup lang="ts">
/**
 * Password Strength Meter
 * 
 * Visual component showing password strength based on OWASP criteria.
 */

const props = defineProps<{
    password: string
}>()

const checks = computed(() => ({
    length: props.password.length >= 8,
    lowercase: /[a-z]/.test(props.password),
    uppercase: /[A-Z]/.test(props.password),
    number: /[0-9]/.test(props.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(props.password),
}))

const passedChecks = computed(() => Object.values(checks.value).filter(Boolean).length)

const strength = computed(() => {
    if (passedChecks.value <= 1) return { label: 'Muito fraca', color: 'red', width: '20%' }
    if (passedChecks.value === 2) return { label: 'Fraca', color: 'orange', width: '40%' }
    if (passedChecks.value === 3) return { label: 'Regular', color: 'yellow', width: '60%' }
    if (passedChecks.value === 4) return { label: 'Boa', color: 'lime', width: '80%' }
    return { label: 'Forte', color: 'green', width: '100%' }
})

const barColorClass = computed(() => {
    const colors: Record<string, string> = {
        red: 'bg-red-500',
        orange: 'bg-orange-500',
        yellow: 'bg-yellow-500',
        lime: 'bg-lime-500',
        green: 'bg-green-500',
    }
    return colors[strength.value.color] || 'bg-zinc-600'
})
</script>

<template>
    <div class="space-y-2">
        <div class="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div class="h-full transition-all duration-300 rounded-full" :class="barColorClass"
                :style="{ width: password ? strength.width : '0%' }" />
        </div>
        <div v-if="password" class="flex items-center justify-between text-xs">
            <span class="text-zinc-400">Força da senha:</span>
            <span :class="{
                'text-red-400': strength.color === 'red',
                'text-orange-400': strength.color === 'orange',
                'text-yellow-400': strength.color === 'yellow',
                'text-lime-400': strength.color === 'lime',
                'text-green-400': strength.color === 'green',
            }">
                {{ strength.label }}
            </span>
        </div>
        <div v-if="password" class="grid grid-cols-2 gap-1 text-xs text-zinc-400">
            <div :class="{ 'text-green-400': checks.length }">
                <UIcon :name="checks.length ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                    class="w-3 h-3 inline mr-1" />
                8+ caracteres
            </div>
            <div :class="{ 'text-green-400': checks.lowercase }">
                <UIcon :name="checks.lowercase ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                    class="w-3 h-3 inline mr-1" />
                Letra minúscula
            </div>
            <div :class="{ 'text-green-400': checks.uppercase }">
                <UIcon :name="checks.uppercase ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                    class="w-3 h-3 inline mr-1" />
                Letra maiúscula
            </div>
            <div :class="{ 'text-green-400': checks.number }">
                <UIcon :name="checks.number ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                    class="w-3 h-3 inline mr-1" />
                Número
            </div>
            <div :class="{ 'text-green-400': checks.special }">
                <UIcon :name="checks.special ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                    class="w-3 h-3 inline mr-1" />
                Caractere especial
            </div>
        </div>
    </div>
</template>
