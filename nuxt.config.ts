// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
  ],

  // Auto-import stores from the stores directory
  imports: {
    dirs: ['stores'],
  },

  runtimeConfig: {
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    public: {
      appName: 'Gabarita.ai'
    }
  },

  nitro: {
    preset: 'cloudflare-pages'
  }
})