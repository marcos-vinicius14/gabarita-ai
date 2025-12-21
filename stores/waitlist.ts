/**
 * Waitlist Store
 * 
 * Manages the state and actions for the waitlist signup feature.
 * Uses Pinia Setup Store syntax for better TypeScript support.
 */

import { z } from 'zod'

// =============================================================================
// Types
// =============================================================================
export interface WaitlistResponse {
    success: boolean
    message: string
}

export interface JoinWaitlistResult {
    success: boolean
    message: string
    isNew?: boolean
}

// =============================================================================
// Validation Schema
// =============================================================================
const emailSchema = z.string().email('Por favor, insira um email válido')

// =============================================================================
// Store Definition (Setup Store Syntax)
// =============================================================================
export const useWaitlistStore = defineStore('waitlist', () => {
    // State
    const email = ref('')
    const loading = ref(false)
    const success = ref(false)
    const error = ref<string | null>(null)

    // Getters
    const isValid = computed(() => emailSchema.safeParse(email.value).success)
    const canSubmit = computed(() => !loading.value && email.value.length > 0)

    // Actions
    function reset() {
        email.value = ''
        success.value = false
        error.value = null
    }

    function setEmail(value: string) {
        email.value = value
        // Clear error when user types
        if (error.value) {
            error.value = null
        }
    }

    async function joinWaitlist(): Promise<JoinWaitlistResult> {
        // Validate email
        const validation = emailSchema.safeParse(email.value)

        if (!validation.success) {
            const errorMessage = validation.error.errors[0]?.message || 'Email inválido'
            error.value = errorMessage
            return {
                success: false,
                message: errorMessage,
            }
        }

        // Start loading
        loading.value = true
        error.value = null

        try {
            const response = await $fetch<WaitlistResponse>('/api/waitlist', {
                method: 'POST',
                body: { email: email.value },
            })

            if (!response.success) {
                error.value = response.message
                return {
                    success: false,
                    message: response.message,
                }
            }

            // Success!
            success.value = true
            email.value = '' // Clear input on success

            return {
                success: true,
                message: response.message,
                isNew: response.message.includes('🎉'),
            }
        } catch (err) {
            const errorMessage = 'Ocorreu um erro. Tente novamente.'
            error.value = errorMessage
            return {
                success: false,
                message: errorMessage,
            }
        } finally {
            loading.value = false
        }
    }

    return {
        // State
        email: readonly(email),
        loading: readonly(loading),
        success: readonly(success),
        error: readonly(error),

        // Getters
        isValid,
        canSubmit,

        // Actions
        setEmail,
        joinWaitlist,
        reset,
    }
})
