import { pgTable, pgEnum, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { users } from '../../domain/auth/schema/users';

// Enums para type-safety no banco de dados
export const deckStatusEnum = pgEnum('deck_status', ['processing', 'ready', 'failed']);
export const deckSourceTypeEnum = pgEnum('deck_source_type', ['topic', 'pdf_upload']);

export const decks = pgTable('tb_decks', {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    userId: uuid('user_id').references(() => users.id).notNull(),
    topic: text('topic').notNull(),
    sourceType: deckSourceTypeEnum('source_type').default('topic').notNull(),
    status: deckStatusEnum('status').default('processing').notNull(),
    r2Key: text('r2_key'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
    index('decks_user_id_idx').on(table.userId),
]);