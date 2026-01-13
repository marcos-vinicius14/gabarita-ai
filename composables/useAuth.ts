/**
 * Auth Composable (TanStack Query)
 * 
 * Provides auth mutations and queries using TanStack Query.
 * Uses discriminated unions for type-safe response handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type {
    UserProfile,
    LoginInput,
    RegisterInput,
    LoginResponse,
    RegisterResponse,
    MeResponse,
    LogoutResponse,
    isSuccess,
} from '~/types/auth'


export const authKeys = {
    all: ['auth'] as const,
    user: () => [...authKeys.all, 'user'] as const,
}


async function fetchCurrentUser(): Promise<MeResponse> {
    return await $fetch<MeResponse>('/api/auth/me', {
        credentials: 'include',
    })
}

async function loginUser(input: LoginInput): Promise<LoginResponse> {
    return await $fetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: input,
        credentials: 'include',
    })
}

async function registerUser(input: RegisterInput): Promise<RegisterResponse> {
    return await $fetch<RegisterResponse>('/api/auth/register', {
        method: 'POST',
        body: input,
        credentials: 'include',
    })
}

async function logoutUser(): Promise<LogoutResponse> {
    return await $fetch<LogoutResponse>('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
    })
}

// =============================================================================
// Composable
// =============================================================================

export function useAuth() {
    const queryClient = useQueryClient()

    const userQuery = useQuery({
        queryKey: authKeys.user(),
        queryFn: fetchCurrentUser,
        select: (data) => {
            if (data.success) {
                return data.data.user
            }
            return null
        },
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    const user = computed(() => userQuery.data.value ?? null)
    const isAuthenticated = computed(() => !!user.value)
    const isLoading = computed(() => userQuery.isLoading.value)

    const loginMutation = useMutation({
        mutationFn: loginUser,
        onSuccess: (data) => {
            if (data.success) {
                // Update the user cache with the returned user
                queryClient.setQueryData(authKeys.user(), data)
            }
        },
    })

    const registerMutation = useMutation({
        mutationFn: registerUser,
    })
    const logoutMutation = useMutation({
        mutationFn: logoutUser,
        onSuccess: () => {
            queryClient.setQueryData(authKeys.user(), null)
            queryClient.invalidateQueries({ queryKey: authKeys.all })
        },
    })

    async function login(input: LoginInput) {
        return await loginMutation.mutateAsync(input)
    }

    async function register(input: RegisterInput) {
        return await registerMutation.mutateAsync(input)
    }

    async function logout() {
        return await logoutMutation.mutateAsync()
    }

    function refetchUser() {
        return userQuery.refetch()
    }

    return {
        user,
        isAuthenticated,
        isLoading,
        userQuery,
        loginMutation,
        registerMutation,
        logoutMutation,

        login,
        register,
        logout,
        refetchUser,
    }
}
