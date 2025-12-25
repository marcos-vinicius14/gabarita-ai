<script setup lang="ts">
/**
 * Login Page (TanStack Query)
 * 
 * BFF Pattern: No tokens handled client-side.
 * Uses TanStack Query mutations for server state.
 */

import { z } from 'zod'
import { isSuccess } from '~/types/auth'

// Page meta
definePageMeta({
    layout: false,
})

useSeoMeta({
    title: 'Entrar | Gabarita.ai',
    description: 'Faça login na sua conta Gabarita.ai',
})

const { login, loginMutation } = useAuth()
const router = useRouter()

const form = reactive({
    email: '',
    password: '',
    rememberMe: false,
})

const showPassword = ref(false)

const loginSchema = z.object({
    email: z.string().email('Por favor, insira um email válido'),
    password: z.string().min(1, 'Por favor, insira sua senha'),
});

const isValid = computed(() => loginSchema.safeParse(form).success)

const isSubmitting = computed(() => loginMutation.isPending.value)
const errorMessage = computed(() => {
    if (loginMutation.error.value) {
        const err = loginMutation.error.value as any
        return err?.data?.message || 'Credenciais inválidas. Tente novamente.'
    }

    const data = loginMutation.data.value
    if (data && !isSuccess(data)) {
        return data.message
    }
    return null
})

async function handleSubmit() {
    const validation = loginSchema.safeParse(form)
    if (!validation.success) return

    try {
        const result = await login({ email: form.email, password: form.password })

        if (isSuccess(result)) {
            await router.push('/dashboard')
        }
    } catch {
    }
}
</script>

<template>
    <div class="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div class="fixed inset-0 pointer-events-none">
            <div
                class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-500/10 rounded-full blur-3xl" />
        </div>
        <div class="relative w-full max-w-md">
            <!-- Logo -->
            <div class="text-center mb-8">
                <NuxtLink to="/" class="inline-flex items-center gap-2">
                    <div
                        class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                        <UIcon name="i-heroicons-sparkles" class="w-6 h-6 text-white" />
                    </div>
                    <span class="text-2xl font-bold text-white">Gabarita.ai</span>
                </NuxtLink>
            </div>

            <!-- Card -->
            <div class="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800 p-8 shadow-2xl">
                <div class="text-center mb-8">
                    <h1 class="text-2xl font-bold text-white mb-2">Bem-vindo de volta!</h1>
                    <p class="text-zinc-400">Entre com suas credenciais para continuar</p>
                </div>

                <!-- Error Alert -->
                <UAlert v-if="errorMessage" color="red" variant="subtle" icon="i-heroicons-exclamation-triangle"
                    :title="errorMessage" class="mb-6"
                    :close-button="{ icon: 'i-heroicons-x-mark', color: 'red', variant: 'link', padded: false }"
                    @close="loginMutation.reset()" />

                <!-- Form -->
                <form @submit.prevent="handleSubmit" class="space-y-5">
                    <!-- Email -->
                    <UFormGroup label="Email" name="email">
                        <UInput v-model="form.email" type="email" placeholder="seu@email.com"
                            icon="i-heroicons-envelope" size="lg" :disabled="isSubmitting" autocomplete="email" />
                    </UFormGroup>

                    <!-- Password -->
                    <UFormGroup label="Senha" name="password">
                        <UInput v-model="form.password" :type="showPassword ? 'text' : 'password'"
                            placeholder="••••••••" icon="i-heroicons-lock-closed" size="lg" :disabled="isSubmitting"
                            autocomplete="current-password" :ui="{ icon: { trailing: { pointer: '' } } }">
                            <template #trailing>
                                <UButton :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" color="gray"
                                    variant="link" :padded="false" @click="showPassword = !showPassword" />
                            </template>
                        </UInput>
                    </UFormGroup>

                    <!-- Remember me & Forgot password -->
                    <div class="flex items-center justify-between">
                        <UCheckbox v-model="form.rememberMe" label="Lembrar de mim" />
                        <NuxtLink to="/forgot-password"
                            class="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                            Esqueceu a senha?
                        </NuxtLink>
                    </div>

                    <!-- Submit Button -->
                    <UButton type="submit" color="violet" size="lg" block :loading="isSubmitting"
                        :disabled="!isValid || isSubmitting">
                        Entrar
                    </UButton>
                </form>

                <!-- Divider -->
                <div class="relative my-8">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-zinc-700" />
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="px-4 bg-zinc-900 text-zinc-500">ou continue com</span>
                    </div>
                </div>

                <!-- Social Login -->
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

                <!-- Register Link -->
                <p class="text-center text-zinc-400 mt-8">
                    Não tem uma conta?
                    <NuxtLink to="/register"
                        class="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                        Criar conta
                    </NuxtLink>
                </p>
            </div>
        </div>
    </div>
</template>
