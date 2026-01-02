/**
 * Credit Transactions Table
 * 
 * Tracks all credit-related transactions for billing history.
 * Types: 'purchase', 'consumption', 'bonus', 'refund'
 */

import { pgTable, text, timestamp, integer, uuid, index, pgEnum } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { users } from '../../domain/auth/schema/users';

export const transactionTypeEnum = pgEnum('transaction_type', [
    'purchase',
    'consumption',
    'bonus',
    'refund',
]);

export const creditTransactions = pgTable('tb_credit_transactions', {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    type: transactionTypeEnum('type').notNull(),
    amount: integer('amount').notNull(), // positive for additions, negative for consumption
    description: text('description'),
    metadata: text('metadata'), // JSON string for additional data (e.g., package_id, deck_id)
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
    index('credit_transactions_user_id_idx').on(table.userId),
    index('credit_transactions_created_at_idx').on(table.createdAt),
]);
