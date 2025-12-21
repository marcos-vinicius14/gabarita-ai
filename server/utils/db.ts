import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const config = useRuntimeConfig();

const client = postgres(config.databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
});

export const db = drizzle(client);
