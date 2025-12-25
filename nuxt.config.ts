// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
  ],

  imports: {
    dirs: ['stores'],
  },

  runtimeConfig: {
    databaseUrl: '',
    googleApiKey: '',
    jwtSecret: process.env.JWT_SECRET,
    upstashRedisUrl: '',
    upstashRedisToken: '',

    public: {
      appName: 'Gabarita.ai'
    }
  },

  nitro: {
    preset: 'cloudflare-pages',
    imports: {
      // Exclude entire exceptions folder - import explicitly from ~/server/utils/exceptions
      exclude: ['**/utils/exceptions/**'],
    },
  },
})