/**
 * Judge Service Unit Tests
 * 
 * Tests for answer evaluation logic using Node.js native test runner.
 * Tests pure logic without AI API calls.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Cosine similarity function extracted for testing
 */
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
}

const SIMILARITY_THRESHOLD_CORRECT = 0.85;
const SIMILARITY_THRESHOLD_INCORRECT = 0.60;

describe('Cosine Similarity', () => {
    it('should return 1 for identical vectors', () => {
        const vector = [1, 2, 3, 4, 5];
        const result = cosineSimilarity(vector, vector);

        assert.strictEqual(result, 1);
    });

    it('should return 0 for orthogonal vectors', () => {
        const a = [1, 0];
        const b = [0, 1];
        const result = cosineSimilarity(a, b);

        assert.strictEqual(result, 0);
    });

    it('should return -1 for opposite vectors', () => {
        const a = [1, 0];
        const b = [-1, 0];
        const result = cosineSimilarity(a, b);

        assert.strictEqual(result, -1);
    });

    it('should throw error for vectors of different lengths', () => {
        const a = [1, 2, 3];
        const b = [1, 2];

        assert.throws(() => cosineSimilarity(a, b), {
            message: 'Vectors must have the same length',
        });
    });

    it('should return 0 for zero vectors', () => {
        const a = [0, 0, 0];
        const b = [1, 2, 3];
        const result = cosineSimilarity(a, b);

        assert.strictEqual(result, 0);
    });

    it('should handle normalized vectors correctly', () => {
        const a = [0.6, 0.8];
        const b = [0.6, 0.8];
        const result = cosineSimilarity(a, b);

        assert.ok(Math.abs(result - 1) < 0.0001);
    });
});

describe('Similarity Thresholds', () => {
    it('should have correct threshold for correct answers', () => {
        assert.strictEqual(SIMILARITY_THRESHOLD_CORRECT, 0.85);
    });

    it('should have correct threshold for incorrect answers', () => {
        assert.strictEqual(SIMILARITY_THRESHOLD_INCORRECT, 0.60);
    });

    it('should have gray zone between thresholds', () => {
        const grayZoneSize = SIMILARITY_THRESHOLD_CORRECT - SIMILARITY_THRESHOLD_INCORRECT;

        assert.ok(grayZoneSize > 0, 'Gray zone should exist');
        assert.strictEqual(grayZoneSize, 0.25);
    });
});

describe('Answer Classification Logic', () => {
    function classifyAnswer(similarity: number): 'correct' | 'incorrect' | 'gray_zone' {
        if (similarity > SIMILARITY_THRESHOLD_CORRECT) {
            return 'correct';
        }

        if (similarity < SIMILARITY_THRESHOLD_INCORRECT) {
            return 'incorrect';
        }

        return 'gray_zone';
    }

    it('should classify high similarity as correct', () => {
        assert.strictEqual(classifyAnswer(0.90), 'correct');
        assert.strictEqual(classifyAnswer(0.95), 'correct');
        assert.strictEqual(classifyAnswer(1.0), 'correct');
    });

    it('should classify low similarity as incorrect', () => {
        assert.strictEqual(classifyAnswer(0.50), 'incorrect');
        assert.strictEqual(classifyAnswer(0.30), 'incorrect');
        assert.strictEqual(classifyAnswer(0.0), 'incorrect');
    });

    it('should classify middle similarity as gray zone', () => {
        assert.strictEqual(classifyAnswer(0.70), 'gray_zone');
        assert.strictEqual(classifyAnswer(0.75), 'gray_zone');
        assert.strictEqual(classifyAnswer(0.80), 'gray_zone');
    });

    it('should handle boundary at correct threshold', () => {
        assert.strictEqual(classifyAnswer(0.85), 'gray_zone');
        assert.strictEqual(classifyAnswer(0.851), 'correct');
    });

    it('should handle boundary at incorrect threshold', () => {
        assert.strictEqual(classifyAnswer(0.60), 'gray_zone');
        assert.strictEqual(classifyAnswer(0.599), 'incorrect');
    });
});

describe('Suggested Rating Logic', () => {
    function getSuggestedRating(isCorrect: boolean, isGrayZone: boolean): 1 | 2 | 3 | 4 {
        if (!isCorrect) return 1;

        if (isGrayZone) return 2;

        return 3;
    }

    it('should suggest 1 (Again) for incorrect answers', () => {
        assert.strictEqual(getSuggestedRating(false, false), 1);
        assert.strictEqual(getSuggestedRating(false, true), 1);
    });

    it('should suggest 2 (Hard) for correct gray zone answers', () => {
        assert.strictEqual(getSuggestedRating(true, true), 2);
    });

    it('should suggest 3 (Good) for clearly correct answers', () => {
        assert.strictEqual(getSuggestedRating(true, false), 3);
    });
});

describe('Input Normalization', () => {
    function normalizeAnswer(answer: string): string {
        return answer.trim();
    }

    it('should trim whitespace', () => {
        assert.strictEqual(normalizeAnswer('  hello  '), 'hello');
    });

    it('should handle empty string', () => {
        assert.strictEqual(normalizeAnswer(''), '');
    });

    it('should handle string with only spaces', () => {
        assert.strictEqual(normalizeAnswer('   '), '');
    });

    it('should preserve internal spaces', () => {
        assert.strictEqual(normalizeAnswer('hello world'), 'hello world');
    });
});

describe('Exact Match Detection', () => {
    function isExactMatch(userAnswer: string, correctAnswer: string): boolean {
        return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    }

    it('should detect exact match', () => {
        assert.strictEqual(isExactMatch('Resposta', 'Resposta'), true);
    });

    it('should be case insensitive', () => {
        assert.strictEqual(isExactMatch('RESPOSTA', 'resposta'), true);
        assert.strictEqual(isExactMatch('ReSpOsTa', 'rEsPoStA'), true);
    });

    it('should ignore leading/trailing whitespace', () => {
        assert.strictEqual(isExactMatch('  Resposta  ', 'Resposta'), true);
    });

    it('should detect non-match', () => {
        assert.strictEqual(isExactMatch('Resposta A', 'Resposta B'), false);
    });
});
