import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const users = pgTable('tb_users', {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    email: text('email').notNull().unique(),
    name: text('name'),
    role: text('role').default('student'),
    plan: text('plan').default('free'),
    createdAt: timestamp('created_at').defaultNow(),
});