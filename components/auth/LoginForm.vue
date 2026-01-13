<script setup lang="ts">
/**
 * Login Form Component
 *
 * Responsible for: Login form UI and submission logic.
 * Uses TanStack Query mutations with discriminated unions.
 */

import { z } from 'zod'
import { isSuccess } from '~/types/auth'

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
})

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

        if (!isSuccess(result)) return

        const userRole = result.data.user.role
        if (userRole === 'admin') {
            await router.push('/admin')
            return
        }

        await router.push('/dashboard')
    } catch {
    }
}
</script>

<template>
    <div class="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 shadow-2xl">
        <div class="text-center mb-6">
            <h1 class="text-xl font-bold text-white mb-1">Bem-vindo de volta!</h1>
            <p class="text-zinc-400 text-sm">Entre com suas credenciais para continuar</p>
        </div>

        <UAlert v-if="errorMessage" color="red" variant="subtle" icon="i-heroicons-exclamation-triangle"
            :title="errorMessage" class="mb-6"
            :close-button="{ icon: 'i-heroicons-x-mark', color: 'red', variant: 'link', padded: false }"
            @close="loginMutation.reset()" />

        <form @submit.prevent="handleSubmit" class="space-y-4">
            <UFormGroup label="Email" name="email">
                <UInput v-model="form.email" type="email" placeholder="seu@email.com" icon="i-heroicons-envelope"
                    size="lg" :disabled="isSubmitting" autocomplete="email" />
            </UFormGroup>

            <UFormGroup label="Senha" name="password">
                <UInput v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="••••••••"
                    icon="i-heroicons-lock-closed" size="lg" :disabled="isSubmitting" autocomplete="current-password"
                    :ui="{ icon: { trailing: { pointer: '' } } }">
                    <template #trailing>
                        <UButton :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" color="gray"
                            variant="link" :padded="false" @click="showPassword = !showPassword" />
                    </template>
                </UInput>
            </UFormGroup>

            <div class="flex items-center justify-between">
                <UCheckbox v-model="form.rememberMe" label="Lembrar de mim" />
                <NuxtLink to="/forgot-password" class="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                    Esqueceu a senha?
                </NuxtLink>
            </div>

            <UButton type="submit" color="violet" size="lg" block :loading="isSubmitting"
                :disabled="!isValid || isSubmitting">
                Entrar
            </UButton>
        </form>

        <div class="relative my-6">
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

        <p class="text-center text-zinc-400 text-sm mt-6">
            Não tem uma conta?
            <NuxtLink to="/register" class="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Criar conta
            </NuxtLink>
        </p>
    </div>
</template>
