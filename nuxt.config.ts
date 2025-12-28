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
    // Local Redis (Docker) - use REDIS_URL env var
    redisUrl: process.env.REDIS_URL ?? '',
    // Upstash Redis (Production)
    upstashRedisUrl: process.env.UPSTASH_REDIS_URL ?? '',
    upstashRedisToken: process.env.UPSTASH_REDIS_TOKEN ?? '',
    // Cloudflare R2 Storage
    r2AccountId: process.env.R2_ACCOUNT_ID ?? '',
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    r2BucketName: process.env.R2_BUCKET_NAME ?? '',

    public: {
      appName: 'Gabarita.ai'
    }
  },

  nitro: {
    preset: 'node-server',
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