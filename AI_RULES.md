# PROJECT: GABARITA.AI - AI GUIDELINES

This document defines the strict coding, architectural, and design rules for the Gabarita.ai project. The AI Assistant (Gemini) must follow these rules in every interaction.

---

## 1. Technical Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Bun |
| **Frontend/Backend** | Nuxt 3 (Vue.js) |
| **UI Library** | Nuxt UI (`@nuxt/ui`) + TailwindCSS |
| **Database** | PostgreSQL + pgvector |
| **ORM** | Drizzle ORM |
| **AI Provider** | Google Gemini (via Vercel AI SDK and LangChain) |

---

## 2. Architecture: Vertical Slices + Rich Domain Model

### 2.A Feature-Based Organization (Vertical Slices)

- **Rule:** Do NOT group code by technical layer (e.g., do not create massive `controllers` or `services` folders).
- **Rule:** Group code by **Functionality**.

> **Example:** If working on "Card Review", the API route, validation schema, and business logic should be collocated or clearly referenced within a `features/review` or `server/domain/review` structure.

### 2.B Rich Domain Model

- **Rule:** Avoid "Anemic Models" (objects that only hold data).
- **Rule:** Business logic MUST reside in the **Domain Layer** (e.g., `server/domain/`), NOT in the API Route handler or Vue Components.

| ✅ Correct | ❌ Incorrect |
|-----------|-------------|
| `server/domain/cards/fsrs.logic.ts` exports a function `calculateNextReview(card, rating)` | Writing the FSRS math directly inside `server/api/review.post.ts` |

### 2.C SOLID & Clean Code

- **SRP (Single Responsibility Principle):** Each file should do one thing. (e.g., Define database tables in separate files: `users.ts`, `decks.ts`).
- **Strong Typing:** NEVER use `any`. Always use TypeScript interfaces and Zod for runtime validation.

---

## 3. UI/UX Guidelines (Mobile First & Nielsen Heuristics)

When generating UI components with Nuxt UI, **RIGOROUSLY** apply Nielsen's 10 Heuristics:

### 3.1 Visibility of System Status

- Always show loading states on buttons and data fetchers.
- Use `UToast` (Toasts) to confirm actions (e.g., "Deck saved successfully").

### 3.2 Match Between System and the Real World

- Use semantic icons (Heroicons/Phosphor).
- Use user-centric terminology ("Deck", "Study", "Memory") instead of system terms ("Record", "Entity").

### 3.3 User Control and Freedom

- Provide "Cancel" buttons on modals.
- Ensure "Back" navigation is available on deep pages.

### 3.4 Consistency and Standards

- Adhere to the "Focus OS" Design System: **Dark Mode First**, **Violet Primary Color**.
- Use `<UCard>`, `<UContainer>`, and `<UButton>` to maintain visual consistency.

### 3.5 Error Prevention

- **Mandatory:** Use `<UModal>` for confirmation before any destructive action (e.g., Delete Deck).
- Disable "Submit" buttons if forms are invalid (`:disabled="!isValid"`).

### 3.6 Recognition Rather Than Recall

- Use helper text in forms: `<UFormGroup label="Topic" help="E.g., Constitutional Law">`.
- Pre-fill data where possible.

### 3.7 Flexibility and Efficiency of Use

- Implement keyboard shortcuts where appropriate (e.g., `CMD+Enter` to save).

### 3.8 Aesthetic and Minimalist Design

- **Mobile First:** Start with base Tailwind classes (e.g., `p-4`) and use `md:`/`lg:` breakpoints for larger screens.
- Remove unnecessary borders or decorations. Focus on the content.

### 3.9 Help Users Recognize, Diagnose, and Recover from Errors

- Error messages must be human-readable.

| ❌ Bad | ✅ Good |
|-------|--------|
| "400 Bad Request" | "We couldn't create your deck. Please try a shorter topic name." |

### 3.10 Help and Documentation

- Use Tooltips (`<UTooltip>`) for icon-only buttons.

---

## 4. Coding Standards (Vue & TypeScript)

| Aspect | Standard |
|--------|----------|
| **Components** | Always use `<script setup lang="ts">` |
| **API Validation** | Use `zod` to validate `readBody` in server routes |
| **Error Handling** | Wrap async operations in `try/catch` blocks and expose errors to the UI |
| **State Management** | Use Pinia for global client state and `useQuery`/`useMutation` (TanStack Query) for server state |
| **Control Flow** | **Always use Early Return Pattern.** Never use `if-else` blocks. Handle edge cases/errors first, return early, then proceed with the happy path. |

### 4.1 Early Return Pattern (Guard Clauses)

- **Rule:** NEVER use `if-else` blocks. Always use early return (guard clauses).
- **Why:** Reduces nesting, improves readability, and makes the "happy path" clear.

| ❌ Incorrect (if-else) | ✅ Correct (Early Return) |
|------------------------|---------------------------|
| `if (success) { doA() } else { doB() }` | `if (!success) { doB(); return } doA()` |

**Example:**

```typescript
// ❌ Bad: Nested if-else
async function handleSubmit() {
    if (response.success) {
        showSuccess()
    } else {
        showError()
    }
}

// ✅ Good: Early return
async function handleSubmit() {
    if (!response.success) {
        showError()
        return
    }
    showSuccess()
}
```