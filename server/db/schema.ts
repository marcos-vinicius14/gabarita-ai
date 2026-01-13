/**
 * Database Schema - Central Export
 * 
 * Re-exports all domain schemas for Drizzle ORM.
 * Each domain owns its schema files following vertical slice architecture.
 */

// Auth Domain
export * from '../domain/auth/schema';

// Flashcard Domain
export * from './tables/decks';
export * from './tables/cards';
export * from './tables/reviews';

// Billing
export * from './tables/credit-transactions';

// Cache
export * from './tables/cache';

// Waitlist
export * from './tables/wailist';