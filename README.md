# Gabarita.ai

Plataforma de estudos com IA.

## Requisitos

- Node.js 22.x (LTS)
- pnpm

## Setup

```bash
pnpm install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build the application for production:

```bash
pnpm build
```

Locally preview production build:

```bash
pnpm preview
```

## Database

```bash
# Generate migrations
pnpm db:generate

# Push migrations
pnpm db:push

# Open Drizzle Studio
pnpm db:studio
```

Check out the [Nuxt deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
