---
description: How to create a new Pinia Store
---

# Create Pinia Store

Follow this workflow to create a new Pinia store for state management.

## 1. Setup

1.  **File**: `stores/[feature].ts`.
2.  **Naming**: `use[Feature]Store` (camelCase feature).
3.  **Pattern**: Use **Setup Store** syntax (`defineStore('id', () => { ... })`).

## 2. Implementation

1.  **State**:
    - Use `ref()` for state variables.
    - Initialize with default values.
    - **Rule**: If managing async data, always include `loading` and `error` states.

2.  **Getters**:
    - Use `computed()` for derived state.

3.  **Actions**:
    - Define async functions for API calls.
    - **Validate** inputs inside actions (using Zod schemas).
    - Manage `loading` and `error` state (try/catch/finally).
    - Call API using `$fetch`.

4.  **Export**:
    - Return an object with everything you want to expose.
    - Use `readonly()` for state if strict mutation control is desired.

## Example Template

```typescript
export const useMyStore = defineStore('myFeature', () => {
    // State
    const items = ref<Item[]>([]);
    const loading = ref(false);
    
    // Actions
    async function fetchItems() {
        loading.value = true;
        try {
            const data = await $fetch('/api/items');
            items.value = data;
        } finally {
            loading.value = false;
        }
    }
    
    return { items, loading, fetchItems };
});
```

## Checklist
- [ ] Uses Setup Store syntax
- [ ] Handles loading/error states
- [ ] Validates inputs
- [ ] Actions handle API calls
