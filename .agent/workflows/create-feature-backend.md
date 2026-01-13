---
description: How to implement a new backend feature (Vertical Slice)
---

# Create Backend Feature (Vertical Slice)

Follow this workflow to create a new backend feature following the Vertical Slice architecture.

## 1. Domain Modeling

1.  **Create Domain Schema** (`server/domain/[feature]/schema/[table].ts`)
    - Define Drizzle schema using `pgTable`.
    - Use snake_case for DB columns, camelCase for TS keys.
    - Export the table constant.

2.  **Create Domain Types** (`server/domain/[feature]/[feature].types.ts`)
    - Define interfaces for the entity.
    - Define Input/Output types for the service.

3.  **Create Repository** (`server/domain/[feature]/[feature].repository.ts`)
    - **Responsibility**: Data Access ONLY (Drizzle operations).
    - Import schema from step 1.
    - Export async functions for CRUD (`findByX`, `create`, `update`, `delete`).
    - Use Drizzle ORM query builders (no `sql` template strings unless necessary).

4.  **Create Service** (`server/domain/[feature]/[feature].service.ts`)
    - **Responsibility**: Business Logic ONLY.
    - Validate inputs.
    - Call Repository functions.
    - Handle domain errors.
    - **Use Early Return Pattern**.
    - **Use Functional Patterns** (map/filter, not loops).

## 2. API Implementation

1.  **Create API Endpoint** (`server/api/[feature]/...`)
    - Use `defineEventHandler`.
    - Retrieve user context if auth required.
    - Validate body/query using **Zod**.
    - Call Service function.
    - **Use Discriminated Unions** for response types (see `AI_RULES.md` #13).
    - **Error Handling**: Wrap in `try/catch` and use `handleException`.

## 3. Testing

1.  **Create Unit Test** (`server/domain/[feature]/[feature].service.test.ts`)
    - Colocate with service.
    - Use `node:test`, `node:assert`, `node:test/mock`.
    - Mock repository calls.
    - Test success paths and error cases.

## Checklist
- [ ] Schema defined in `domain/[feature]/schema`
- [ ] Repository handles DB operations
- [ ] Service handles Business Logic
- [ ] API uses Zod and correct error handling
- [ ] Unit tests pass
- [ ] NO direct DB calls in Service or API
- [ ] NO business logic in API
