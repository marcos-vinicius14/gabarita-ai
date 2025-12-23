import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const config = useRuntimeConfig();

const isProduction = process.env.NODE_ENV === 'production';
const isNeonDatabase = config.databaseUrl?.includes('neon.tech');

const client = postgres(config.databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: isProduction || isNeonDatabase ? 'require' : false,
});

export const db = drizzle(client);
