<script setup lang="ts">
/**
 * Register Form Component
 *
 * Responsible for: Registration form UI and submission logic.
 * Uses TanStack Query mutations with discriminated unions.
 */

import { z } from 'zod'
import { isSuccess } from '~/types/auth'

const { register, registerMutation } = useAuth()
const router = useRouter()
const toast = useToast()

const form = reactive({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)

const registerSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Por favor, insira um email válido'),
    password: z.string()
        .min(8, 'Senha deve ter pelo menos 8 caracteres')
        .regex(/[a-z]/, 'Senha deve conter letra minúscula')
        .regex(/[A-Z]/, 'Senha deve conter letra maiúscula')
        .regex(/[0-9]/, 'Senha deve conter número')
        .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Senha deve conter caractere especial'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
        errorMap: () => ({ message: 'Você deve aceitar os termos' }),
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
})

const validation = computed(() => registerSchema.safeParse(form))
const isValid = computed(() => validation.value.success)

const fieldErrors = computed(() => {
    if (validation.value.success) return {}
    const errors: Record<string, string> = {}
    validation.value.error.errors.forEach((err) => {
        const field = err.path[0]?.toString()
        if (field && !errors[field]) {
            errors[field] = err.message
        }
    })
    return errors
})

const isSubmitting = computed(() => registerMutation.isPending.value)
const errorMessage = computed(() => {
    if (registerMutation.error.value) {
        const err = registerMutation.error.value as any
        return err?.data?.message || 'Erro ao criar conta. Tente novamente.'
    }
    const data = registerMutation.data.value
    if (data && !isSuccess(data)) {
        return data.message
    }
    return null
})

async function handleSubmit() {
    if (!validation.value.success) return

    try {
        const result = await register({
            name: form.name,
            email: form.email,
            password: form.password,
        })

        if (isSuccess(result)) {
            toast.add({
                title: 'Conta criada com sucesso!',
                description: 'Faça login para começar.',
                icon: 'i-heroicons-check-circle',
                color: 'green',
            })
            await router.push('/login')
        }
    } catch {
    }
}
</script>

<template>
    <div class="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 shadow-2xl">
        <div class="text-center mb-5">
            <h1 class="text-xl font-bold text-white mb-1">Crie sua conta</h1>
            <p class="text-zinc-400 text-sm">Comece a estudar de forma inteligente</p>
        </div>

        <UAlert v-if="errorMessage" color="red" variant="subtle" icon="i-heroicons-exclamation-triangle"
            :title="errorMessage" class="mb-6"
            :close-button="{ icon: 'i-heroicons-x-mark', color: 'red', variant: 'link', padded: false }"
            @close="registerMutation.reset()" />

        <form @submit.prevent="handleSubmit" class="space-y-3">
            <UFormGroup label="Nome" name="name" :error="form.name && fieldErrors.name">
                <UInput v-model="form.name" type="text" placeholder="Seu nome" icon="i-heroicons-user" size="lg"
                    :disabled="isSubmitting" autocomplete="name" />
            </UFormGroup>

            <UFormGroup label="Email" name="email" :error="form.email && fieldErrors.email">
                <UInput v-model="form.email" type="email" placeholder="seu@email.com" icon="i-heroicons-envelope"
                    size="lg" :disabled="isSubmitting" autocomplete="email" />
            </UFormGroup>

            <UFormGroup label="Senha" name="password">
                <UInput v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="••••••••"
                    icon="i-heroicons-lock-closed" size="lg" :disabled="isSubmitting" autocomplete="new-password"
                    :ui="{ icon: { trailing: { pointer: '' } } }">
                    <template #trailing>
                        <UButton :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" color="gray"
                            variant="link" :padded="false" @click="showPassword = !showPassword" />
                    </template>
                </UInput>
                <div class="mt-2">
                    <AuthPasswordStrengthMeter :password="form.password" />
                </div>
            </UFormGroup>

            <UFormGroup label="Confirmar Senha" name="confirmPassword"
                :error="form.confirmPassword && fieldErrors.confirmPassword">
                <UInput v-model="form.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'"
                    placeholder="••••••••" icon="i-heroicons-lock-closed" size="lg" :disabled="isSubmitting"
                    autocomplete="new-password" :ui="{ icon: { trailing: { pointer: '' } } }">
                    <template #trailing>
                        <UButton :icon="showConfirmPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" color="gray"
                            variant="link" :padded="false" @click="showConfirmPassword = !showConfirmPassword" />
                    </template>
                </UInput>
            </UFormGroup>

            <UCheckbox v-model="form.acceptTerms">
                <template #label>
                    <span class="text-sm text-zinc-400">
                        Li e aceito os
                        <NuxtLink to="/terms" class="text-violet-400 hover:text-violet-300">Termos de Uso</NuxtLink>
                        e a
                        <NuxtLink to="/privacy" class="text-violet-400 hover:text-violet-300">Política de
                            Privacidade</NuxtLink>
                    </span>
                </template>
            </UCheckbox>

            <UButton type="submit" color="violet" size="lg" block :loading="isSubmitting"
                :disabled="!isValid || isSubmitting">
                Criar conta
            </UButton>
        </form>

        <div class="relative my-5">
            <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-zinc-700" />
            </div>
            <div class="relative flex justify-center text-sm">
                <span class="px-4 bg-zinc-900 text-zinc-500">ou continue com</span>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
            <UButton color="white" variant="outline" size="lg" block disabled>
                <template #leading>
                    <UIcon name="i-simple-icons-google" class="w-5 h-5" />
                </template>
                Google
            </UButton>
            <UButton color="white" variant="outline" size="lg" block disabled>
                <template #leading>
                    <UIcon name="i-simple-icons-apple" class="w-5 h-5" />
                </template>
                Apple
            </UButton>
        </div>

        <p class="text-center text-zinc-400 text-sm mt-5">
            Já tem uma conta?
            <NuxtLink to="/login" class="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Entrar
            </NuxtLink>
        </p>
    </div>
</template>
