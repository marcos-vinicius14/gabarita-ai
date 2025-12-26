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
    // Local Redis (Docker) - use REDIS_URL env var
    redisUrl: process.env.REDIS_URL ?? '',
    // Upstash Redis (Production)
    upstashRedisUrl: process.env.UPSTASH_REDIS_URL ?? '',
    upstashRedisToken: process.env.UPSTASH_REDIS_TOKEN ?? '',

    public: {
      appName: 'Gabarita.ai'
    }
  },

  nitro: {
    preset: 'cloudflare-pages',
    imports: {
      // Exclude _internal folder - exceptions should be imported from ~/server/utils/exceptions
      // Exclude session.ts to prevent conflict with h3's getSession/updateSession
      exclude: [
        '**/utils/exceptions/_internal/**',
        '**/utils/auth/session.ts',
      ],
    },
    rollupConfig: {
      external: ['pg-native'],
    },
  },

  alias: {
    'pg-native': 'unenv/runtime/mock/empty',
  },
})