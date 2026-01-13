/**
 * Password Utility Tests
 * 
 * Tests for password hashing and verification functions.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hashPassword, verifyPassword, hashToken } from './password';

describe('hashPassword', () => {
    it('should return a hash in the correct format', async () => {
        const password = 'MySecurePassword123!';

        const hash = await hashPassword(password);

        assert.ok(hash.startsWith('$pbkdf2$100000$'));
        const parts = hash.split('$');
        assert.strictEqual(parts.length, 5);
    });

    it('should generate different hashes for the same password', async () => {
        const password = 'MySecurePassword123!';

        const hash1 = await hashPassword(password);
        const hash2 = await hashPassword(password);

        assert.notStrictEqual(hash1, hash2);
    });

    it('should generate a hash with 32-character hex salt', async () => {
        const password = 'TestPassword';

        const hash = await hashPassword(password);
        const saltHex = hash.split('$')[3];

        assert.strictEqual(saltHex.length, 32);
    });
});

describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
        const password = 'MySecurePassword123!';
        const hash = await hashPassword(password);

        const result = await verifyPassword(hash, password);

        assert.strictEqual(result, true);
    });

    it('should return false for incorrect password', async () => {
        const password = 'MySecurePassword123!';
        const wrongPassword = 'WrongPassword456!';
        const hash = await hashPassword(password);

        const result = await verifyPassword(hash, wrongPassword);

        assert.strictEqual(result, false);
    });

    it('should return false for invalid hash format', async () => {
        const invalidHash = 'not-a-valid-hash';

        const result = await verifyPassword(invalidHash, 'password');

        assert.strictEqual(result, false);
    });

    it('should return false for wrong algorithm identifier', async () => {
        const wrongAlgoHash = '$bcrypt$100000$abc123$def456';

        const result = await verifyPassword(wrongAlgoHash, 'password');

        assert.strictEqual(result, false);
    });
});

describe('hashToken', () => {
    it('should return a 64-character hex string', () => {
        const token = 'my-random-token-12345';

        const hash = hashToken(token);

        assert.strictEqual(hash.length, 64);
        assert.match(hash, /^[a-f0-9]+$/);
    });

    it('should return the same hash for the same token', () => {
        const token = 'deterministic-token';

        const hash1 = hashToken(token);
        const hash2 = hashToken(token);

        assert.strictEqual(hash1, hash2);
    });

    it('should return different hashes for different tokens', () => {
        const token1 = 'token-one';
        const token2 = 'token-two';

        const hash1 = hashToken(token1);
        const hash2 = hashToken(token2);

        assert.notStrictEqual(hash1, hash2);
    });
});
