---
description: How to create a new UI Component
---

# Create UI Component

Follow this workflow to create a new Vue 3 / Nuxt 3 component following UI/UX and Coding guidelines.

## 1. Structure & Naming

1.  **Naming**: Use PascalCase (e.g., `UserProfile.vue`).
2.  **Location**: Place in `components/[feature]/` folder. Split responsibilities (Rule 5).
3.  **Template**: Start with `<script setup lang="ts">`.

## 2. Implementation

1.  **Definition**:
    - Use `interface Props` and `defineProps<Props>()`.
    - Use `defineEmits` for events.

2.  **State**:
    - Local state: `ref()`.
    - Global state: `use[Feature]Store()` (Pinia).
    - **Do NOT** fetch API directly in component script (except `useAsyncData` for SSR). Prefer Store actions or Composables.

3.  **Logic**:
    - Use **Early Return Pattern** in methods.
    - Avoid complex logic in templates (use `computed`).

4.  **UI/UX (Nielsen Heuristics)**:
    - **Visibility**: Show loading state (`:loading` props).
    - **Feedback**: Use `useToast()` for success/error feedback.
    - **Consistency**: Use Nuxt UI components (`<UButton>`, `<UCard>`, `<UInput>`).
    - **Mobile First**: Use standard Tailwind classes (`p-4` for mobile, `md:p-8` for desktop).

## 3. Interaction

1.  **Events**: Emit events for parent communication (`emit('save', data)`).
2.  **Errors**: Handle store errors gracefully (display toast or inline error).

## Checklist
- [ ] Component name is PascalCase
- [ ] Located in feature subdirectory
- [ ] Uses `<script setup lang="ts">`
- [ ] Props/Emits typed properly
- [ ] Uses Nuxt UI components
- [ ] Mobile-first styling
- [ ] Loading states handled
