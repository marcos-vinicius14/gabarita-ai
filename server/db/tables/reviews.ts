import { pgTable, timestamp, integer, uuid, index } from 'drizzle-orm/pg-core';
import { cards } from './cards';
import { users } from '../../domain/auth/schema/users';
import { uuidv7 } from 'uuidv7';

export const reviews = pgTable('tb_reviews', {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    cardId: uuid('card_id').references(() => cards.id).notNull(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    rating: integer('rating').notNull(),
    reviewedAt: timestamp('reviewed_at').defaultNow(),
}, (table) => [
    index('reviews_card_id_idx').on(table.cardId),
    index('reviews_user_id_idx').on(table.userId),
    index('reviews_reviewed_at_idx').on(table.reviewedAt),
]);