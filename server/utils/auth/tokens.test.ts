/**
 * Token Utility Tests
 * 
 * Tests for JWT and refresh token generation/verification.
 */

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
    generateRandomToken,
    generateFamilyId,
    getRefreshTokenExpiry,
} from './tokens';

describe('generateRandomToken', () => {
    it('should generate a 64-character hex string by default (32 bytes)', () => {
        const token = generateRandomToken();

        assert.strictEqual(token.length, 64);
        assert.match(token, /^[a-f0-9]+$/);
    });

    it('should generate different tokens on each call', () => {
        const token1 = generateRandomToken();
        const token2 = generateRandomToken();

        assert.notStrictEqual(token1, token2);
    });

    it('should respect custom length parameter', () => {
        const length = 16;

        const token = generateRandomToken(length);

        assert.strictEqual(token.length, length * 2);
    });
});

describe('generateFamilyId', () => {
    it('should generate a 32-character hex string (16 bytes)', () => {
        const familyId = generateFamilyId();

        assert.strictEqual(familyId.length, 32);
        assert.match(familyId, /^[a-f0-9]+$/);
    });

    it('should generate different family IDs on each call', () => {
        const id1 = generateFamilyId();
        const id2 = generateFamilyId();

        assert.notStrictEqual(id1, id2);
    });
});

describe('getRefreshTokenExpiry', () => {
    it('should return a date 7 days in the future', () => {
        const now = new Date();
        const expectedMinDate = new Date(now);
        expectedMinDate.setDate(expectedMinDate.getDate() + 6);

        const expectedMaxDate = new Date(now);
        expectedMaxDate.setDate(expectedMaxDate.getDate() + 8);

        const expiry = getRefreshTokenExpiry();

        assert.ok(expiry > expectedMinDate);
        assert.ok(expiry < expectedMaxDate);
    });

    it('should return a Date object', () => {
        const expiry = getRefreshTokenExpiry();

        assert.ok(expiry instanceof Date);
    });
});

// Note: generateAccessToken and verifyAccessToken require useRuntimeConfig()
// which is only available in Nuxt server context.
// These should be tested via integration tests or with proper mocking.
