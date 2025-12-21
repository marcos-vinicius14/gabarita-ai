import { pgTable, text, timestamp, integer, vector, uuid, index } from 'drizzle-orm/pg-core';
import { decks } from './decks';
import { uuidv7 } from 'uuidv7';

export const cards = pgTable('tb_cards', {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    deckId: uuid('deck_id').references(() => decks.id, { onDelete: 'cascade' }).notNull(),

    front: text('front').notNull(),
    back: text('back').notNull(),

    embedding: vector('embedding', { dimensions: 768 }),

    stability: integer('stability').default(0),
    difficulty: integer('difficulty').default(0),
    lastReview: timestamp('last_review'),
    nextReview: timestamp('next_review').defaultNow(),

    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('cards_deck_id_idx').on(table.deckId),
    index('cards_next_review_idx').on(table.nextReview),
]);