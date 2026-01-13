/**
 * Vue Query Plugin
 * 
 * Configures TanStack Query for server state management.
 */

import { VueQueryPlugin, QueryClient, type VueQueryPluginOptions } from '@tanstack/vue-query'

export default defineNuxtPlugin((nuxtApp) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5,
                gcTime: 1000 * 60 * 30,
                retry: 1,
                refetchOnWindowFocus: false,
            },
            mutations: {
                retry: 0,
            },
        },
    })

    const options: VueQueryPluginOptions = {
        queryClient,
    }

    nuxtApp.vueApp.use(VueQueryPlugin, options)
})
