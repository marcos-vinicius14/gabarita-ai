import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const waitlist = pgTable('tb_waitlist', {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    source: text('source').default('landing_page'),
    created_at: timestamp('created_at').defaultNow(),
});