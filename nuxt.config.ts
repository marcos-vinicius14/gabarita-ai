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
    databaseUrl: process.env.DATABASE_URL,
    googleApiKey: process.env.GOOGLE_API_KEY,
    jwtSecret: process.env.JWT_SECRET,
    // Cloudflare R2 Storage
    r2AccountId: process.env.R2_ACCOUNT_ID ?? '',
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    r2BucketName: process.env.R2_BUCKET_NAME ?? '',

    public: {
      appName: 'Gabarita.ai',
      wsUrl: process.env.NUXT_PUBLIC_WS_URL ?? 'ws://localhost:3002',
    }
  },

  nitro: {
    preset: 'node-server',
    imports: {
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