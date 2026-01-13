---
description: How to create an Integration Test
---

# Create Integration Test

Follow this workflow to create integration tests for API endpoints or complex flows.

## 1. Setup

1.  **Location**: `tests/integration/[feature].integration.test.ts`.
2.  **Naming**: `[feature].integration.test.ts`.
3.  **Imports**: Import `describe`, `it`, `before`, `after` from `node:test`.

## 2. Implementation

1.  **Database**:
    - Integration tests run against a real (or Dockerized) database.
    - Use `before()` to seed data.
    - Use `after()` to clean up.

2.  **API Calls**:
    - Use `setup()` from `@nuxt/test-utils` (if applicable) or make HTTP requests to the running server.
    - Test the full flow (Request -> Controller -> Service -> Repo -> DB).

## Example Template

```typescript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { db } from '~/server/utils/db';

describe('Auth Integration', () => {
    before(async () => {
        // Seed user
    });

    it('should login successfully', async () => {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com', password: 'pass' })
        });
        
        assert.strictEqual(response.status, 200);
        const data = await response.json();
        assert.ok(data.token);
    });
    
    after(async () => {
        // Cleanup
    });
});
```

## Checklist
- [ ] Located in `tests/integration`
- [ ] Tests full stack flow
- [ ] cleans up data after run
