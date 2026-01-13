---
description: If-Less Programming Patterns - Functional and Polymorphic alternatives to if/else
---

# If-Less Programming Patterns

This workflow documents patterns for writing cleaner code by replacing `if/else` statements with functional and polymorphic approaches.

## 1. Object Maps (Dicionários)

Replace `if/else` or `switch` with objects that map keys to values or functions:

```typescript
// ❌ Avoid
function getMessage(status: string) {
    if (status === 'success') return 'Concluído';
    if (status === 'error') return 'Erro';
    if (status === 'pending') return 'Aguardando';
    return 'Desconhecido';
}

// ✅ Prefer
const messages: Record<string, string> = {
    success: 'Concluído',
    error: 'Erro',
    pending: 'Aguardando',
};
const getMessage = (status: string) => messages[status] ?? 'Desconhecido';
```

### With Functions (Strategy Pattern)

```typescript
const handlers: Record<string, () => void> = {
    save: () => saveDocument(),
    delete: () => deleteDocument(),
    export: () => exportDocument(),
};

handlers[action]?.();
```

---

## 2. Early Return (Guard Clauses)

Handle edge cases first, return early, then proceed with happy path:

```typescript
// ✅ Guard clauses
function processUser(user: User | null) {
    if (!user) return { error: 'Not found' };
    if (!user.active) return { error: 'Inactive' };
    if (!user.verified) return { error: 'Not verified' };
    
    // Happy path here
    return { data: user };
}
```

---

## 3. Optional Chaining + Nullish Coalescing

Replace null checks with operators:

```typescript
// ❌ Avoid
let name;
if (user && user.profile && user.profile.name) {
    name = user.profile.name;
} else {
    name = 'Anônimo';
}

// ✅ Prefer
const name = user?.profile?.name ?? 'Anônimo';
```

---

## 4. Short-Circuit Evaluation

For simple conditional execution:

```typescript
// ❌ Avoid
if (isValid) {
    submit();
}

// ✅ Prefer (for simple cases)
isValid && submit();
```

> ⚠️ Use sparingly. Complex conditions hurt readability.

---

## 5. Array Methods

Replace loops with `if` using array methods:

```typescript
// ❌ Avoid
const results = [];
for (const item of items) {
    if (item.active) {
        results.push(item.name);
    }
}

// ✅ Prefer
const results = items
    .filter(item => item.active)
    .map(item => item.name);
```

---

## 6. Polymorphism

Use interfaces and implementations instead of type checking:

```typescript
// ❌ Avoid
function notify(type: string, message: string) {
    if (type === 'email') sendEmail(message);
    else if (type === 'sms') sendSMS(message);
    else if (type === 'push') sendPush(message);
}

// ✅ Prefer
interface Notifier {
    send(message: string): void;
}

const notifiers: Record<string, Notifier> = {
    email: { send: (msg) => sendEmail(msg) },
    sms: { send: (msg) => sendSMS(msg) },
    push: { send: (msg) => sendPush(msg) },
};

notifiers[type].send(message);
```

---

## 7. Ternary for Expressions

Use ternary when you need a value, not side effects:

```typescript
// ✅ Good for values
const status = isActive ? 'Ativo' : 'Inativo';
const icon = isLoading ? 'spinner' : 'check';
```

---

## When to Use `if`

Some cases where `if` is still appropriate:
- Complex boolean expressions with multiple `&&` and `||`
- Side effects with cleanup (try/catch)
- Readability would suffer with alternative patterns
