# PROJECT: GABARITA.AI - AI GUIDELINES

This document defines the strict coding, architectural, and design rules for the Gabarita.ai project. The AI Assistant (Gemini) must follow these rules in every interaction.

---

## 1. Technical Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js (LTS) |
| **Package Manager** | pnpm |
| **Frontend/Backend** | Nuxt 3 (Vue.js) |
| **UI Library** | Nuxt UI (`@nuxt/ui`) + TailwindCSS |
| **Database** | PostgreSQL (Neon) + pgvector |
| **ORM** | Drizzle ORM |
| **AI Provider** | Google Gemini (via Vercel AI SDK and LangChain) |
| **Testing** | Node.js Native Test Runner (`node:test`) |

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

---

## 5. Component Architecture (SRP)

### 5.1 Single Responsibility Principle for Components

- **Rule:** Each component should have ONE responsibility.
- **Rule:** If a component does more than one thing (layout + API calls + state), **split it**.

| ❌ God Component | ✅ Split Components |
|------------------|---------------------|
| `pages/index.vue` with 300+ lines doing SEO, forms, API, layout | `pages/index.vue` (SEO only) + `HeroSection.vue` (form) + `FeaturesGrid.vue` (display) |

### 5.2 Component Naming Convention

- **Rule:** Use **PascalCase** for component names.
- **Rule:** Use **prefix folders** to organize by feature.

```
components/
├── landing/           # Landing page components
│   ├── HeroSection.vue
│   ├── FeaturesGrid.vue
│   ├── SocialProof.vue
│   └── TheFooter.vue
├── dashboard/         # Dashboard components
│   ├── StatsCard.vue
│   └── RecentDecks.vue
└── common/            # Shared/reusable components
    ├── TheNavbar.vue
    └── LoadingSpinner.vue
```

### 5.3 Component Structure Template

Every component should follow this structure:

```vue
<script setup lang="ts">
/**
 * ComponentName
 * 
 * Responsible for: [Single responsibility description]
 */

// 1. Imports (external and internal)
import { useMyStore } from '~/stores/myStore'

// 2. Props & Emits
interface Props {
    title: string
    isActive?: boolean
}
const props = withDefaults(defineProps<Props>(), {
    isActive: false
})
const emit = defineEmits<{
    (e: 'update', value: string): void
}>()

// 3. Composables & Stores
const store = useMyStore()
const toast = useToast()

// 4. Reactive State
const isLoading = ref(false)

// 5. Computed Properties
const displayTitle = computed(() => props.title.toUpperCase())

// 6. Functions (with early return pattern)
async function handleSubmit() {
    // ...
}

// 7. Lifecycle Hooks
onMounted(() => {
    // ...
})
</script>

<template>
    <!-- Single root element with semantic HTML -->
</template>
```

### 5.4 Page vs Component Responsibilities

| Layer | Responsibility |
|-------|----------------|
| **`pages/*.vue`** | SEO (`useSeoMeta`, `useHead`), route params, composing child components |
| **`components/*.vue`** | UI rendering, user interaction, calling stores for data/actions |
| **`stores/*.ts`** | State management, API calls, business logic |

---

## 6. State Management (Pinia)

### 6.1 When to Use Pinia

| Use Case | Solution |
|----------|----------|
| Local component state (form input, toggle) | `ref()` / `reactive()` |
| Shared state across components | **Pinia Store** |
| Server data fetching | TanStack Query (`useQuery`) |
| Complex form with validation | Pinia Store + Zod |

### 6.2 Store Location & Naming

- **Location:** `stores/[feature].ts`
- **Naming:** `use[Feature]Store` (e.g., `useWaitlistStore`, `useDeckStore`)

### 6.3 Setup Store Syntax (Preferred)

Always use the **Setup Store** syntax for better TypeScript support:

```typescript
// stores/waitlist.ts
import { z } from 'zod'

// Types
interface JoinResult {
    success: boolean
    message: string
}

// Validation
const emailSchema = z.string().email('Invalid email')

// Store Definition
export const useWaitlistStore = defineStore('waitlist', () => {
    // === STATE ===
    const email = ref('')
    const loading = ref(false)
    const error = ref<string | null>(null)

    // === GETTERS (computed) ===
    const isValid = computed(() => emailSchema.safeParse(email.value).success)

    // === ACTIONS ===
    function setEmail(value: string) {
        email.value = value
        if (error.value) error.value = null
    }

    async function joinWaitlist(): Promise<JoinResult> {
        // Validate first
        const validation = emailSchema.safeParse(email.value)
        if (!validation.success) {
            error.value = validation.error.errors[0]?.message ?? 'Error'
            return { success: false, message: error.value }
        }

        loading.value = true
        try {
            const response = await $fetch('/api/waitlist', {
                method: 'POST',
                body: { email: email.value }
            })
            email.value = ''
            return { success: true, message: response.message }
        } catch {
            error.value = 'Connection error'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    // === RETURN (expose to components) ===
    return {
        // State (readonly for safety)
        email: readonly(email),
        loading: readonly(loading),
        error: readonly(error),
        // Getters
        isValid,
        // Actions
        setEmail,
        joinWaitlist,
    }
})
```

### 6.4 Using Store in Components

```vue
<script setup lang="ts">
import { useWaitlistStore } from '~/stores/waitlist'

const store = useWaitlistStore()
const toast = useToast()

// Local state that syncs with store
const localEmail = ref('')
watch(localEmail, (v) => store.setEmail(v))

async function handleSubmit() {
    const result = await store.joinWaitlist()
    
    if (!result.success) {
        toast.add({ title: 'Error', description: result.message, color: 'red' })
        return
    }
    
    toast.add({ title: 'Success!', description: result.message, color: 'green' })
    localEmail.value = ''
}
</script>

<template>
    <form @submit.prevent="handleSubmit">
        <UInput v-model="localEmail" :disabled="store.loading" />
        <UButton type="submit" :loading="store.loading">Submit</UButton>
    </form>
</template>
```

---

## 7. Testing (Node.js Native Test Runner)

### 7.1 Test Framework

- **Rule:** Use Node.js native test runner (`node:test`) for all unit tests.
- **Rule:** Use native `node:assert` for assertions.
- **Why:** Zero dependencies, built into Node.js, fast execution.

### 7.2 Test File Location & Naming

| Type | Location | Naming |
|------|----------|--------|
| **Unit Tests** | Colocated with source file | `*.test.ts` |
| **Integration Tests** | `tests/integration/` | `*.integration.test.ts` |

**Example Structure:**
```
server/
├── domain/
│   └── waitlist/
│       ├── waitlist.service.ts
│       ├── waitlist.service.test.ts     # Unit test colocated
│       ├── waitlist.repository.ts
│       └── waitlist.repository.test.ts
tests/
└── integration/
    └── waitlist.integration.test.ts
```

### 7.3 Test Structure Template

```typescript
// waitlist.service.test.ts
import { describe, it, mock, beforeEach } from 'node:test'
import assert from 'node:assert'
import { joinWaitlist } from './waitlist.service'

describe('joinWaitlist', () => {
    // === SETUP ===
    let mockDb: any
    let mockSaveEmail: any

    beforeEach(() => {
        // Reset mocks before each test
        mockDb = {}
        mockSaveEmail = mock.fn()
    })

    // === TESTS ===
    it('should return success message for new email', async () => {
        // Arrange
        mockSaveEmail.mock.mockImplementation(() => 
            Promise.resolve({ success: true, isNewEmail: true })
        )

        // Act
        const result = await joinWaitlist(mockDb, 'test@example.com', 'landing')

        // Assert
        assert.strictEqual(result.success, true)
        assert.ok(result.message.includes('list'))
    })

    it('should normalize email to lowercase', async () => {
        // Arrange
        mockSaveEmail.mock.mockImplementation(() => 
            Promise.resolve({ success: true, isNewEmail: true })
        )

        // Act
        await joinWaitlist(mockDb, 'TEST@EXAMPLE.COM', 'landing')

        // Assert
        const calledWith = mockSaveEmail.mock.calls[0].arguments
        assert.strictEqual(calledWith[1], 'test@example.com')
    })

    it('should return different message for existing email', async () => {
        // Arrange
        mockSaveEmail.mock.mockImplementation(() => 
            Promise.resolve({ success: true, isNewEmail: false })
        )

        // Act
        const result = await joinWaitlist(mockDb, 'existing@example.com', 'landing')

        // Assert
        assert.strictEqual(result.success, true)
        assert.ok(result.message.includes('already'))
    })
})
```

### 7.4 Mocking & Stubbing

| Technique | When to Use | How |
|-----------|-------------|-----|
| **`mock.fn()`** | Mock function calls | `const fn = mock.fn()` |
| **`mock.method()`** | Mock object methods | `mock.method(obj, 'methodName', mockFn)` |
| **Stub Object** | Replace entire dependency | Create a plain object with mock methods |

**Example - Mocking Database:**

```typescript
import { mock } from 'node:test'

// Create a stub database
const stubDb = {
    insert: mock.fn(() => ({
        values: mock.fn(() => Promise.resolve())
    }))
}

// Use in tests
await saveEmail(stubDb, 'test@example.com', 'source')
assert.strictEqual(stubDb.insert.mock.calls.length, 1)
```

### 7.5 Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/domain/waitlist/waitlist.service.test.ts

# Run with watch mode
pnpm test --watch

# Run with coverage
pnpm test --experimental-test-coverage
```

### 7.6 Package.json Script

```json
{
  "scripts": {
    "test": "node --import tsx --test **/*.test.ts",
    "test:watch": "node --import tsx --test --watch **/*.test.ts",
    "test:coverage": "node --import tsx --test --experimental-test-coverage **/*.test.ts"
  }
}
```

### 7.7 Test Naming Convention

- **Rule:** Use descriptive test names that explain the expected behavior.
- **Rule:** Follow the pattern: `should [expected behavior] when [condition]`

| ❌ Bad | ✅ Good |
|-------|--------|
| `test email` | `should normalize email to lowercase` |
| `joinWaitlist works` | `should return success message for new email` |

---

## 8. Error Handling (Custom Exceptions)

### 8.1 Exception Hierarchy

- **Rule:** Use custom exception classes from `server/utils/exceptions/`.
- **Rule:** NEVER throw generic `Error` objects in API routes.
- **Rule:** All error messages MUST be user-friendly (localized for the target audience).

| Layer | Exception Type |
|-------|----------------|
| **Base** | `HttpException` (abstract base class) |
| **4xx** | `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `ConflictException`, `ValidationException`, `TooManyRequestsException` |
| **5xx** | `InternalServerException`, `ServiceUnavailableException` |
| **Auth** | `InvalidCredentialsException`, `AccountLockedException`, `LoginRateLimitException`, `InvalidTokenException`, `TokenExpiredException` |

### 8.2 Using Exceptions in API Routes

```typescript
// ✅ Correct: Use handleException + custom exceptions
import { handleException, ValidationException } from '~/server/utils/exceptions';

export default defineEventHandler(async (event) => {
    try {
        const parseResult = Schema.safeParse(body);
        
        if (!parseResult.success) {
            throw new ValidationException('Please fix the validation errors.', errors);
        }
        
        // ... happy path
    } catch (error) {
        return handleException(event, error);
    }
});
```

```typescript
// ❌ Incorrect: Manual error handling
setResponseStatus(event, 400);
return { success: false, message: 'Bad Request' };
```

### 8.3 Exception Response Format

All exceptions return a consistent JSON structure:

```json
{
    "success": false,
    "message": "User-friendly error message",
    "code": "ERROR_CODE",
    "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 8.4 User-Friendly Error Messages

| ❌ Technical | ✅ User-Friendly |
|-------------|------------------|
| `"400 Bad Request"` | `"Please fix the validation errors."` |
| `"401 Unauthorized"` | `"Invalid email or password."` |
| `"403 Forbidden"` | `"You don't have permission to perform this action."` |
| `"429 Too Many Requests"` | `"Too many attempts. Please wait 5 minutes."` |
| `"500 Internal Server Error"` | `"An unexpected error occurred. Please try again."` |

### 8.5 Creating Domain-Specific Exceptions

When creating new features, extend base exceptions with semantic meaning:

```typescript
// server/utils/exceptions/deck.exception.ts
import { NotFoundException, ForbiddenException } from './http.exception';

export class DeckNotFoundException extends NotFoundException {
    constructor() {
        super('Deck not found.', { code: 'DECK_NOT_FOUND' });
    }
}

export class DeckAccessDeniedException extends ForbiddenException {
    constructor() {
        super('You don\'t have access to this deck.', { code: 'DECK_ACCESS_DENIED' });
    }
}
```

---

## 9. SOLID Principles

### 9.1 Single Responsibility Principle (SRP)

- **Rule:** A class/module should have only ONE reason to change.
- **Why:** Increases cohesion and makes maintenance and testing easier.

| ❌ SRP Violation | ✅ Applying SRP |
|------------------|-----------------|
| `AuthController` that validates, authenticates, generates tokens, and saves logs | `AuthService` (logic), `TokenService` (tokens), `AuditLogger` (logs) |

```typescript
// ❌ Violation: Class does too many things
class UserService {
    async register(data) { /* validates, hashes, saves, sends email */ }
    async sendEmail(user) { /* email logic */ }
    async generateReport() { /* generates report */ }
}

// ✅ Correct: Separated responsibilities
class UserService { async register(data) { /* registration only */ } }
class EmailService { async send(to, template) { /* email only */ } }
class ReportService { async generate() { /* reports only */ } }
```

### 9.2 Dependency Inversion Principle (DIP)

- **Rule:** Depend on abstractions (interfaces), NOT on concrete implementations.
- **Why:** Reduces coupling and makes testing with mocks easier.

```typescript
// ❌ Tight coupling: depends on concrete implementation
class AuthService {
    private repository = new PostgresUserRepository();
}

// ✅ Dependency inversion: depends on abstraction
interface UserRepository {
    findByEmail(email: string): Promise<User | null>;
    create(data: CreateUserInput): Promise<User>;
}

class AuthService {
    constructor(private repository: UserRepository) {}
}
```

### 9.3 Interface Segregation Principle (ISP)

- **Rule:** Create specific interfaces instead of a single generic interface.
- **Why:** Clients should not depend on methods they don't use.

```typescript
// ❌ "Fat" interface
interface Repository<T> {
    find(): Promise<T[]>;
    findById(id: string): Promise<T>;
    create(data: T): Promise<T>;
    update(id: string, data: T): Promise<T>;
    delete(id: string): Promise<void>;
    generateReport(): Promise<Report>;
    sendNotification(): Promise<void>;
}

// ✅ Segregated interfaces
interface ReadRepository<T> {
    find(): Promise<T[]>;
    findById(id: string): Promise<T>;
}

interface WriteRepository<T> {
    create(data: T): Promise<T>;
    update(id: string, data: T): Promise<T>;
    delete(id: string): Promise<void>;
}
```

---

## 10. GRASP Patterns

### 10.1 Information Expert

- **Rule:** Assign responsibility to the class that has the information needed to fulfill it.
- **Why:** Keeps data and behavior together (high cohesion).

```typescript
// ❌ Logic outside the expert
function calculateDeckProgress(deck: Deck, reviews: Review[]): number {
    return reviews.filter(r => r.deckId === deck.id).length / deck.totalCards;
}

// ✅ Deck is the expert - it has the information
class Deck {
    calculateProgress(): number {
        return this.reviews.length / this.totalCards;
    }
}
```

### 10.2 Controller

- **Rule:** Use a mediator object to receive system events.
- **Why:** Separates user interface from business logic.

```typescript
// In Nuxt, API handlers act as Controllers
// server/api/auth/login.post.ts (Controller)
export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const result = await loginUser(body); // Delegates to Service
    return result;
});

// server/domain/auth/auth.service.ts (Service - business logic)
export async function loginUser(input: LoginInput): Promise<AuthResult> {
    // All business logic here
}
```

### 10.3 Indirection

- **Rule:** Add an intermediate object between coupled components.
- **Why:** Reduces direct dependency and makes substitution easier.

```typescript
// ❌ Component depends directly on database
class AuthService {
    async findUser(email: string) {
        return await db.select().from(users).where(eq(users.email, email));
    }
}

// ✅ Repository as indirection
class AuthService {
    constructor(private userRepository: UserRepository) {}
    
    async findUser(email: string) {
        return await this.userRepository.findByEmail(email);
    }
}
```

---

## 11. Design Patterns

### 11.1 Dependency Injection

- **Rule:** Provide dependencies externally, don't create them internally.
- **Why:** Allows swapping implementations without changing code.

```typescript
// ✅ Dependency injection via parameters
export function createAuthService(deps: {
    userRepository: UserRepository;
    tokenService: TokenService;
    auditLogger: AuditLogger;
}) {
    return {
        async login(input: LoginInput) {
            const user = await deps.userRepository.findByEmail(input.email);
            const token = await deps.tokenService.generate(user);
            await deps.auditLogger.log('LOGIN', user.id);
            return { token };
        }
    };
}

// Production usage
const authService = createAuthService({
    userRepository: new DrizzleUserRepository(db),
    tokenService: new JwtTokenService(secret),
    auditLogger: new DatabaseAuditLogger(db),
});

// Test usage
const authService = createAuthService({
    userRepository: mockUserRepository,
    tokenService: mockTokenService,
    auditLogger: mockAuditLogger,
});
```

### 11.2 Strategy Pattern

- **Rule:** Encapsulate interchangeable algorithms in separate classes.
- **Why:** Allows swapping behaviors at runtime.

```typescript
// Review calculation strategies
interface ReviewStrategy {
    calculateNextReview(card: Card, rating: number): Date;
}

class FSRSStrategy implements ReviewStrategy {
    calculateNextReview(card: Card, rating: number): Date {
        // FSRS implementation
    }
}

class SM2Strategy implements ReviewStrategy {
    calculateNextReview(card: Card, rating: number): Date {
        // SuperMemo 2 implementation
    }
}

// Usage
class ReviewService {
    constructor(private strategy: ReviewStrategy) {}
    
    processReview(card: Card, rating: number) {
        return this.strategy.calculateNextReview(card, rating);
    }
}
```

### 11.3 Facade Pattern

- **Rule:** Provide a simplified interface for a complex system.
- **Why:** Decouples the client from numerous internal classes.

```typescript
// Facade for authentication operations
export const AuthFacade = {
    async login(email: string, password: string) {
        // Orchestrates: validation, rate limiting, authentication, tokens, audit
        await rateLimiter.check(email);
        const user = await userRepository.findByEmail(email);
        const isValid = await passwordService.verify(user.hash, password);
        const tokens = await tokenService.generatePair(user);
        await auditLogger.log('LOGIN', user.id);
        return tokens;
    },
    
    async logout(token: string) { /* ... */ },
    async refresh(refreshToken: string) { /* ... */ },
};
```

### 11.4 Observer Pattern

- **Rule:** Allow communication between objects via events.
- **Why:** Decouples sender and receiver.

```typescript
// Event emitter for domain events
type DomainEvents = {
    'user:registered': { userId: string; email: string };
    'deck:created': { deckId: string; userId: string };
    'review:completed': { cardId: string; rating: number };
};

class EventBus {
    private listeners = new Map<string, Function[]>();
    
    on<K extends keyof DomainEvents>(event: K, handler: (data: DomainEvents[K]) => void) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event)!.push(handler);
    }
    
    emit<K extends keyof DomainEvents>(event: K, data: DomainEvents[K]) {
        this.listeners.get(event)?.forEach(fn => fn(data));
    }
}

// Usage
eventBus.on('user:registered', async (data) => {
    await emailService.sendWelcome(data.email);
});
```

---

## 12. Additional Best Practices

### 12.1 Prefer Composition Over Inheritance

- **Rule:** Use composition to assemble behaviors, not inheritance.
- **Why:** Inheritance creates rigid coupling; composition is flexible.

```typescript
// ❌ Rigid inheritance
class AdminUser extends User {
    canDeleteUsers = true;
}

// ✅ Flexible composition
interface Permissions {
    canDeleteUsers: boolean;
    canManageDecks: boolean;
}

class User {
    constructor(
        public id: string,
        public email: string,
        public permissions: Permissions
    ) {}
}

const adminPermissions: Permissions = { canDeleteUsers: true, canManageDecks: true };
const userPermissions: Permissions = { canDeleteUsers: false, canManageDecks: false };
```

### 12.2 Modularization

- **Rule:** Divide the system into independent modules with clear interfaces.
- **Why:** Facilitates maintenance, testing, and scalability.

```
server/domain/
├── auth/                    # Authentication module
│   ├── auth.service.ts
│   ├── auth.repository.ts
│   ├── auth.types.ts
│   └── schema/
├── decks/                   # Decks module
│   ├── deck.service.ts
│   ├── deck.repository.ts
│   └── deck.types.ts
└── review/                  # Review module
    ├── review.service.ts
    ├── fsrs.strategy.ts
    └── review.types.ts
```

### 12.3 Minimize Shared State

- **Rule:** Avoid global variables or implicitly shared state.
- **Why:** Prevents side effects and race conditions.

```typescript
// ❌ Shared global state
let currentUser: User | null = null;

function setCurrentUser(user: User) {
    currentUser = user;
}

// ✅ State passed explicitly
function processRequest(user: User, request: Request) {
    // user is passed explicitly
}

// ✅ Or encapsulated in context
class RequestContext {
    constructor(public user: User, public request: Request) {}
}
```

### 12.4 Testability as a Requirement

- **Rule:** Design code thinking about how it will be tested.
- **Why:** Testable code is naturally more modular and decoupled.

```typescript
// ✅ Pure function - easy to test
function calculateDueDate(lastReview: Date, interval: number): Date {
    return new Date(lastReview.getTime() + interval * 24 * 60 * 60 * 1000);
}

// ✅ Injectable dependencies - easy to mock
export function createReviewService(deps: {
    cardRepository: CardRepository;
    dateProvider: () => Date;
}) {
    return {
        async scheduleReview(cardId: string) {
            const card = await deps.cardRepository.findById(cardId);
            const now = deps.dateProvider();
            // ...
        }
    };
}

```

---

## 13. Discriminated Unions Pattern

### 13.1 Overview

- **Rule:** Use **Discriminated Unions** (Tagged Unions) for all API response types.
- **Why:** Provides exhaustive type checking, eliminates null/undefined ambiguities, and makes error handling explicit.
- **When:** API responses, result types, state machines, and any scenario with multiple possible outcomes.

### 13.2 API Response Types

Always define API responses as discriminated unions:

```typescript
// types/api.ts

// Base response shapes
interface SuccessResponse<T> {
    success: true;
    message: string;
    data: T;
}

interface ErrorResponse {
    success: false;
    message: string;
    code?: string;
    errors?: Record<string, string[]>;
}

// Discriminated union type
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Example usage
export type LoginResponse = ApiResponse<{ user: UserProfile }>;
export type RegisterResponse = ApiResponse<undefined>;
```

### 13.3 Type Guards

Always create type guard functions for runtime checking:

```typescript
// ✅ Type guard functions
export function isSuccess<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
    return response.success === true;
}

export function isError<T>(response: ApiResponse<T>): response is ErrorResponse {
    return response.success === false;
}
```

### 13.4 Usage with Early Return Pattern

Combine discriminated unions with early return for clean code:

```typescript
// ✅ Correct: Discriminated union + early return
async function handleLogin() {
    const result = await login({ email, password });
    
    // Type guard narrows the type
    if (!isSuccess(result)) {
        showError(result.message);  // TypeScript knows result is ErrorResponse
        return;
    }
    
    // TypeScript knows result is SuccessResponse<{ user: UserProfile }>
    const { user } = result.data;
    navigateTo('/dashboard');
}
```

```typescript
// ❌ Incorrect: Optional properties without union
interface BadResponse {
    success: boolean;
    message: string;
    data?: { user: UserProfile };  // Ambiguous - when is data present?
    code?: string;
}
```

### 13.5 TanStack Query Integration

Use discriminated unions with TanStack Query:

```typescript
// composables/useAuth.ts
import { useMutation, useQuery } from '@tanstack/vue-query';
import { isSuccess, type LoginResponse, type LoginInput } from '~/types/auth';

export function useAuth() {
    const loginMutation = useMutation({
        mutationFn: async (input: LoginInput): Promise<LoginResponse> => {
            return await $fetch('/api/auth/login', {
                method: 'POST',
                body: input,
            });
        },
    });

    async function login(input: LoginInput) {
        const result = await loginMutation.mutateAsync(input);
        
        if (isSuccess(result)) {
            // TypeScript knows: result.data.user exists
            return result.data.user;
        }
        
        // TypeScript knows: result.message, result.code exist
        throw new Error(result.message);
    }

    return { login, loginMutation };
}
```

### 13.6 State Machine Example

Use discriminated unions for complex state:

```typescript
// ✅ State machine with discriminated unions
type AuthState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'authenticated'; user: UserProfile }
    | { status: 'error'; message: string };

function renderAuthUI(state: AuthState) {
    switch (state.status) {
        case 'idle':
            return <LoginForm />;
        case 'loading':
            return <Spinner />;
        case 'authenticated':
            // TypeScript knows: state.user exists
            return <Dashboard user={state.user} />;
        case 'error':
            // TypeScript knows: state.message exists
            return <ErrorAlert message={state.message} />;
    }
}
```

### 13.7 Benefits Summary

| Benefit | Description |
|---------|-------------|
| **Type Safety** | Compiler catches missing cases |
| **Self-Documenting** | Types describe all possible states |
| **No Null Checks** | No more `if (data?.user)` ambiguity |
| **Exhaustive Handling** | `switch` statements require all cases |
| **Refactoring Safety** | Adding new variants breaks compilation where unhandled |
```